#!/bin/sh
cd "$(dirname "$0")"
cd ../
npx tsc && npx cdk deploy --region us-east-1