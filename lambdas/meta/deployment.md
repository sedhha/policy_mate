````bash
➜  lambdas git:(agent_multi_flow_integration) ✗ uv run agentcore launch
🚀 Launching Bedrock AgentCore (codebuild mode - RECOMMENDED)...
   • Build ARM64 containers in the cloud with CodeBuild
   • No local Docker required (DEFAULT behavior)
   • Production-ready deployment

💡 Deployment options:
   • agentcore launch                → CodeBuild (current)
   • agentcore launch --local        → Local development
   • agentcore launch --local-build  → Local build + cloud deploy

Using existing memory: policyMateV2_mem-oEv5a6FyoF
Starting CodeBuild ARM64 deployment for agent 'policyMateV2' to account 354468042457 (us-east-1)
⠙ Launching Bedrock AgentCore...Setting up AWS resources (ECR repository, execution roles)...
Getting or creating ECR repository for agent: policyMateV2
✅ Reusing existing ECR repository:
354468042457.dkr.ecr.us-east-1.amazonaws.com/bedrock-agentcore-policymatev2
⠹ Launching Bedrock AgentCore...✅ ECR repository available: 354468042457.dkr.ecr.us-east-1.amazonaws.com/bedrock-agentcore-policymatev2
Getting or creating execution role for agent: policyMateV2
Using AWS region: us-east-1, account ID: 354468042457
Role name: AmazonBedrockAgentCoreSDKRuntime-us-east-1-d28752dc24
⠏ Launching Bedrock AgentCore...Role doesn't exist, creating new execution role: AmazonBedrockAgentCoreSDKRuntime-us-east-1-d28752dc24
Starting execution role creation process for agent: policyMateV2
✓ Role creating: AmazonBedrockAgentCoreSDKRuntime-us-east-1-d28752dc24
Creating IAM role: AmazonBedrockAgentCoreSDKRuntime-us-east-1-d28752dc24
⠸ Launching Bedrock AgentCore...✓ Role created: arn:aws:iam::354468042457:role/AmazonBedrockAgentCoreSDKRuntime-us-east-1-d28752dc24
⠇ Launching Bedrock AgentCore...✓ Execution policy attached: BedrockAgentCoreRuntimeExecutionPolicy-policyMateV2
Role creation complete and ready for use with Bedrock AgentCore
✅ Execution role available: arn:aws:iam::354468042457:role/AmazonBedrockAgentCoreSDKRuntime-us-east-1-d28752dc24
Preparing CodeBuild project and uploading source...
⠏ Launching Bedrock AgentCore...Getting or creating CodeBuild execution role for agent: policyMateV2
Role name: AmazonBedrockAgentCoreSDKCodeBuild-us-east-1-d28752dc24
⠴ Launching Bedrock AgentCore...Reusing existing CodeBuild execution role: arn:aws:iam::354468042457:role/AmazonBedrockAgentCoreSDKCodeBuild-us-east-1-d28752dc24
⠇ Launching Bedrock AgentCore...Using dockerignore.template with 45 patterns for zip filtering
Including Dockerfile from /home/shivamsahil/projects/2025/oct/policy_mate/lambdas/.bedrock_agentcore/policyMateV2 in source.zip
⠼ Launching Bedrock AgentCore...Uploaded source to S3: policyMateV2/source.zip
⠹ Launching Bedrock AgentCore...Updated CodeBuild project: bedrock-agentcore-policymatev2-builder
Starting CodeBuild build (this may take several minutes)...
⠇ Launching Bedrock AgentCore...Starting CodeBuild monitoring...
⠹ Launching Bedrock AgentCore...🔄 QUEUED started (total: 0s)
⠏ Launching Bedrock AgentCore...✅ QUEUED completed in 1.3s
🔄 PROVISIONING started (total: 2s)
⠙ Launching Bedrock AgentCore...✅ PROVISIONING completed in 8.1s
🔄 DOWNLOAD_SOURCE started (total: 10s)
⠇ Launching Bedrock AgentCore...✅ DOWNLOAD_SOURCE completed in 1.4s
🔄 BUILD started (total: 11s)
⠏ Launching Bedrock AgentCore...✅ BUILD completed in 17.9s
🔄 POST_BUILD started (total: 29s)
⠦ Launching Bedrock AgentCore...✅ POST_BUILD completed in 9.3s
🔄 COMPLETED started (total: 38s)
⠸ Launching Bedrock AgentCore...✅ COMPLETED completed in 1.3s
🎉 CodeBuild completed successfully in 0m 39s
CodeBuild completed successfully
✅ CodeBuild project configuration saved
Deploying to Bedrock AgentCore...
Passing memory configuration to agent: policyMateV2_mem-oEv5a6FyoF
⠦ Launching Bedrock AgentCore...✅ Agent created/updated: arn:aws:bedrock-agentcore:us-east-1:354468042457:runtime/policyMateV2-IOHx2v3WjF
Observability is enabled, configuring Transaction Search...
⠏ Launching Bedrock AgentCore...Created/updated CloudWatch Logs resource policy
⠴ Launching Bedrock AgentCore...Configured X-Ray trace segment destination to CloudWatch Logs
⠏ Launching Bedrock AgentCore...X-Ray indexing rule already configured
✅ Transaction Search configured: resource_policy, trace_destination
🔍 GenAI Observability Dashboard:
   https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#gen-ai-observability/agent-core
Polling for endpoint to be ready...
⠸ Launching Bedrock AgentCore...Agent endpoint: arn:aws:bedrock-agentcore:us-east-1:354468042457:runtime/policyMateV2-IOHx2v3WjF/runtime-endpoint/DEFAULT
Deployment completed successfully - Agent: arn:aws:bedrock-agentcore:us-east-1:354468042457:runtime/policyMateV2-IOHx2v3WjF
╭────────────────────────────────────────── Deployment Success ──────────────────────────────────────────╮
│ Agent Details:                                                                                         │
│ Agent Name: policyMateV2                                                                               │
│ Agent ARN: arn:aws:bedrock-agentcore:us-east-1:354468042457:runtime/policyMateV2-IOHx2v3WjF            │
│ ECR URI: 354468042457.dkr.ecr.us-east-1.amazonaws.com/bedrock-agentcore-policymatev2:latest            │
│ CodeBuild ID: bedrock-agentcore-policymatev2-builder:5f74454d-90e5-4fd9-b964-27fc0f686481              │
│                                                                                                        │
│ 🚀 ARM64 container deployed to Bedrock AgentCore                                                       │
│                                                                                                        │
│ Next Steps:                                                                                            │
│    agentcore status                                                                                    │
│    agentcore invoke '{"prompt": "Hello"}'                                                              │
│                                                                                                        │
│ 📋 CloudWatch Logs:                                                                                    │
│    /aws/bedrock-agentcore/runtimes/policyMateV2-IOHx2v3WjF-DEFAULT --log-stream-name-prefix            │
│ "2025/10/18/[runtime-logs]"                                                                            │
│    /aws/bedrock-agentcore/runtimes/policyMateV2-IOHx2v3WjF-DEFAULT --log-stream-names "otel-rt-logs"   │
│                                                                                                        │
│ 🔍 GenAI Observability Dashboard:                                                                      │
│    https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#gen-ai-observability/agent-core     │
│                                                                                                        │
│ ⏱️  Note: Observability data may take up to 10 minutes to appear after first launch                     │
│                                                                                                        │
│ 💡 Tail logs with:                                                                                     │
│    aws logs tail /aws/bedrock-agentcore/runtimes/policyMateV2-IOHx2v3WjF-DEFAULT                       │
│ --log-stream-name-prefix "2025/10/18/[runtime-logs]" --follow                                          │
│    aws logs tail /aws/bedrock-agentcore/runtimes/policyMateV2-IOHx2v3WjF-DEFAULT                       │
│ --log-stream-name-prefix "2025/10/18/[runtime-logs]" --since 1h                                        │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────╯
➜  lambdas git:(agent_multi_flow_integration) ✗ ```
````
