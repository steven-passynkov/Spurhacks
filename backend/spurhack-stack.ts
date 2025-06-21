import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dotenv from 'dotenv';

dotenv.config({path: path.resolve(__dirname, './.env')});

export class Spurhack extends Stack {

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
            bucketName: 'spurhacks-media',
            publicReadAccess: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });

        const opensearchDomain = new Domain(this, 'spurhacks', {
            version: EngineVersion.OPENSEARCH_2_11,
            domainName: `spurhacks-domain`,
            removalPolicy: RemovalPolicy.DESTROY,
            capacity: {
                dataNodes: 1,
                dataNodeInstanceType: 't3.small.search',
                multiAzWithStandbyEnabled: false
            },
            ebs: {
                volumeSize: 10,
                volumeType: EbsDeviceVolumeType.GP2,
            },
            zoneAwareness: {
                enabled: false,
            },
            nodeToNodeEncryption: false,
            encryptionAtRest: {
                enabled: false,
            },
            enforceHttps: false,
        });

        const vpc = new ec2.Vpc(this, 'SpurhacksVPC', {
            maxAzs: 1,
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                }
            ]
        });

        const webserverSG = new ec2.SecurityGroup(this, 'WebserverSG', {
            vpc,
            allowAllOutbound: true,
        });

        webserverSG.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8000),
            'Allow WebSocket'
        );

        webserverSG.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(22),
            'Allow SSH access'
        );

        const keyPair = ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'spurhacks');


        const instance = new ec2.Instance(this, 'spurhacks-websocket', {
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC
            },
            securityGroup: webserverSG,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            // machineImage: new ec2.AmazonLinuxImage({
            //     generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
            // }),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            keyPair: keyPair
        });

        new CfnOutput(this, 'InstancePublicIP', {
            value: instance.instancePublicIp,
            description: 'Public IP of the EC2 instance',
        });


        // Create API Gateway before Lambda
        const api = new apigateway.RestApi(this, 'SpurhacksApi', {
            restApiName: 'Spurhacks Service',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['*'],
            },
        });

        const searchFn = new lambda.Function(this, 'SearchFn', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda/searchFn/src')),
            timeout: Duration.minutes(3),
            memorySize: 1024,
            environment: {
                OPENSEARCH_COLLECTION_ENDPOINT: `https://${opensearchDomain.domainEndpoint}`,
                INDEX_NAME: 'spurhacks',
                S3_BUCKET: mediaBucket.bucketName,
                GOOGLE_SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT || '',
                GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || ''
            }
        });

        const searchIntegration = new apigateway.LambdaIntegration(searchFn);
        const searchResource = api.root.addResource('search');
        searchResource.addMethod('GET', searchIntegration);
        searchResource.addMethod('POST', searchIntegration);

        mediaBucket.grantReadWrite(searchFn);

        opensearchDomain.grantReadWrite(searchFn);

        searchFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                'es:ESHttpPost',
                'es:ESHttpPut',
                'es:ESHttpGet',
                'es:ESHttpDelete'
            ],
            resources: ['*']
        }));
    }
}