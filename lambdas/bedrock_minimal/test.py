from unittest.mock import Mock
from bedrock_handler import lambda_handler

if __name__ == "__main__":
    x = Mock()
    x.aws_request_id = "019a0660-5dcd-7259-b615-53a2b4afa032"
    x = lambda_handler({
        "body": '{"prompt": "test", "session_id": "019a0660-5dcd-7259-b615-53a2b4afa032"}'
    }, x)
    print(x)