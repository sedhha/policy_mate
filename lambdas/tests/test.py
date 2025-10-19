import json
from src.tools.comprehensive_check import comprehensive_check_tool


if __name__ == "__main__":
    # Example usage
    result = comprehensive_check_tool(
        framework_id="GDPR",
        document_id="ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c"
    )
    
    # Pretty print the result
    print("\n" + "="*80)
    print("ANALYSIS RESULT:")
    print("="*80)
    print(f"Success: {result.get('success')}")
    print(f"Cached: {result.get('cached', False)}")
    print(f"File ID: {result.get('document_id')}")
    print(f"Analysis ID: {result.get('analysis_id')}")
    print(f"Framework: {result.get('framework')}")
    print(f"Annotations: {result.get('annotations_count')}")
    
    # Save full result to file
    with open("./tests/analysis_result.json", "w") as f:
        json.dump(result, f, indent=2)