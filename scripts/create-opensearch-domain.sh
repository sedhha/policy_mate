#!/bin/bash
# Create AWS OpenSearch Service domain (t3.small.search for free tier)

export AWS_PROFILE=policy-mate

DOMAIN_NAME="policy-mate"
REGION="us-east-1"

echo "Creating OpenSearch domain: $DOMAIN_NAME"

aws opensearch create-domain \
  --domain-name "$DOMAIN_NAME" \
  --engine-version "OpenSearch_2.11" \
  --cluster-config \
    InstanceType=t2.small.search,InstanceCount=1 \
  --ebs-options \
    EBSEnabled=true,VolumeType=gp3,VolumeSize=10 \
  --access-policies '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"AWS": "*"},
      "Action": "es:*",
      "Resource": "arn:aws:es:'$REGION':*:domain/'$DOMAIN_NAME'/*"
    }]
  }' \
  --region "$REGION"

echo "Domain creation initiated. This takes 10-15 minutes."
echo "Check status: aws opensearch describe-domain --domain-name $DOMAIN_NAME"
