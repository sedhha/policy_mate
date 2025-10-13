# filePath: lambdas/pre/load_compliance.py
import json
from src.utils.services.dynamoDB import DynamoDBTable, get_table

table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)

def load_compliance_data(json_file_path: str):
    """Load compliance controls from JSON into DynamoDB"""
    
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    with table.batch_writer() as batch:
        for framework in data:
            framework_id = framework['framework_id']
            
            for control in framework['controls']:
                item = {
                    'framework_id': framework_id,
                    'control_id': control['control_id'],
                    'framework_name': framework['framework_name'],
                    'version': framework.get('version', ''),
                    'category': control['category'],
                    'requirement': control['requirement'],
                    'keywords': control['keywords'],
                    'severity': control['severity'],
                    'verification_points': control['verification_points'],
                }
                
                # Add framework-specific fields
                if 'article' in control:
                    item['article'] = control['article']
                if 'rule_reference' in control:
                    item['rule_reference'] = control['rule_reference']
                if 'trust_service' in control:
                    item['trust_service'] = control['trust_service']
                if 'implementation_spec' in control:
                    item['implementation_spec'] = control['implementation_spec']
                
                batch.put_item(Item=item)
    
    print("Successfully loaded compliance controls to DynamoDB")

# Execute loading
load_compliance_data('./pre/compliance.json')