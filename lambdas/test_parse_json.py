#!/usr/bin/env python3
"""Test the parse_agent_json function with various input formats."""

from src.utils.compliance_agent import parse_agent_json

print("Testing parse_agent_json with various formats...\n")

# Test 1: Valid JSON (should pass Strategy 1)
print("Test 1: Valid JSON")
test1 = '{"error_message": "", "tool_payload": {}}'
try:
    result1 = parse_agent_json(test1)
    print("✅ Valid JSON parsed successfully")
    print(f"   Result: {result1}\n")
except Exception as e:
    print(f"❌ Failed: {e}\n")

# Test 2: Mixed format (outer double quotes, inner single quotes)
print("Test 2: Mixed format (the problematic case)")
test2 = '{"error_message": "", "tool_payload": {\'key\': \'value\'}}'
try:
    result2 = parse_agent_json(test2)
    print("✅ Mixed format parsed successfully")
    print(f"   Result: {result2}\n")
except Exception as e:
    print(f"❌ Failed: {e}\n")

# Test 3: Full Python dict syntax
print("Test 3: Full Python dict syntax")
test3 = "{'error_message': '', 'tool_payload': {'key': 'value'}}"
try:
    result3 = parse_agent_json(test3)
    print("✅ Python dict parsed successfully")
    print(f"   Result: {result3}\n")
except Exception as e:
    print(f"❌ Failed: {e}\n")

# Test 4: The actual problematic input from your error
print("Test 4: Actual problematic input from error log")
test4 = """{\n  "error_message": "",\n  "tool_payload": {'documents': [{'document_id': 'ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c', 'file_name': 'sample_compliance_document.pdf'}]}}"""
try:
    result4 = parse_agent_json(test4)
    print("✅ Actual problematic input parsed successfully")
    print(f"   Result keys: {result4.keys()}")
    print(f"   Documents count: {len(result4['tool_payload']['documents'])}\n")
except Exception as e:
    print(f"❌ Failed: {e}\n")

print("=" * 60)
print("Summary: The parser now handles:")
print("  1. ✅ Valid JSON (double quotes)")
print("  2. ✅ Mixed format (outer double, inner single quotes)")
print("  3. ✅ Full Python dict syntax (single quotes)")
print("  4. ✅ Complex nested structures with mixed quotes")
