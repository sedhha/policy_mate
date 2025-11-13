#!/usr/bin/env python3
"""
Load compliance controls from OpenSearch backup to DynamoDB.
This script reads the backup JSON file and writes control units directly to DynamoDB.
"""

import json
import sys
from decimal import Decimal
from pathlib import Path

# Import utilities directly (we're already in lambdas/src/)
from utils.services.dynamoDB import DynamoDBTable, get_table


def serialize_for_dynamodb(item):
    """
    Convert Python types to DynamoDB-compatible types.
    Recursively handles nested structures and converts floats to Decimals.
    
    Args:
        item: The item to serialize
        
    Returns:
        DynamoDB-compatible item
    """
    if isinstance(item, dict):
        return {k: serialize_for_dynamodb(v) for k, v in item.items()}
    elif isinstance(item, list):
        return [serialize_for_dynamodb(v) for v in item]
    elif isinstance(item, float):
        # Convert float to Decimal for DynamoDB
        return Decimal(str(item))
    else:
        return item


def load_controls_from_backup(backup_file: str, batch_size: int = 25):
    """
    Load compliance controls from OpenSearch backup JSON to DynamoDB.
    
    Args:
        backup_file: Path to the backup JSON file (NDJSON format - one JSON object per line)
        batch_size: Number of items to write per batch (max 25 for DynamoDB)
    """
    table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
    
    # Read backup file (NDJSON format - one JSON object per line)
    print(f"Reading backup file: {backup_file}")
    backup_data = []
    with open(backup_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line:  # Skip empty lines
                backup_data.append(json.loads(line))
    
    print(f"Found {len(backup_data)} control records in backup")
    
    # Process records
    success_count = 0
    error_count = 0
    batch = []
    
    for i, record in enumerate(backup_data):
        try:
            # Extract control data from OpenSearch format
            source = record.get('_source', {})
            
            # Build DynamoDB item with required fields
            item = {
                'framework_id': source['framework_id'],
                'control_id': source['control_id'],
                'requirement': source['requirement'],
                'keywords': source.get('keywords', []),
                'category': source['category'],
                'severity': source['severity'],
                'embedding': source.get('embedding', []),
                'is_indexed': False  # Flag to track OpenSearch indexing status
            }
            
            # Serialize embeddings (convert floats to Decimals)
            serialized_item = serialize_for_dynamodb(item)
            
            # Add to batch
            batch.append({'PutRequest': {'Item': serialized_item}})
            
            # Write batch when it reaches batch_size or last item
            if len(batch) >= batch_size or i == len(backup_data) - 1:
                if batch:
                    response = table.meta.client.batch_write_item(
                        RequestItems={
                            table.name: batch
                        }
                    )
                    
                    # Check for unprocessed items
                    unprocessed = response.get('UnprocessedItems', {})
                    if unprocessed:
                        print(f"Warning: {len(unprocessed)} unprocessed items in batch")
                    
                    success_count += len(batch)
                    print(f"Processed {success_count}/{len(backup_data)} controls...")
                    batch = []
                    
        except Exception as e:
            error_count += 1
            control_id = record.get('_source', {}).get('control_id', 'unknown')
            print(f"Error processing control {control_id}: {e}")
            continue
    
    print(f"\n{'='*60}")
    print(f"Load complete!")
    print(f"Successfully loaded: {success_count} controls")
    print(f"Errors: {error_count}")
    print(f"Total processed: {success_count + error_count}")
    print(f"{'='*60}")
    
    return success_count, error_count


def main():
    """Main entry point"""
    # Path to backup file (now relative from lambdas/src/)
    backup_file = Path(__file__).parent.parent.parent / "backup" / "compliance_controls_data.json"
    
    if not backup_file.exists():
        print(f"Error: Backup file not found at {backup_file}")
        sys.exit(1)
    
    print("="*60)
    print("DynamoDB Control Loader")
    print("="*60)
    print(f"Backup file: {backup_file}")
    print(f"Target table: {DynamoDBTable.COMPLIANCE_CONTROLS.value}")
    print("="*60)
    
    # Confirm with user
    response = input("\nProceed with loading? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Aborted by user")
        sys.exit(0)
    
    # Load controls
    success, errors = load_controls_from_backup(str(backup_file))
    
    if errors > 0:
        print(f"\nWarning: {errors} errors occurred during load")
        sys.exit(1)
    else:
        print("\nAll controls loaded successfully!")
        sys.exit(0)


if __name__ == '__main__':
    main()
