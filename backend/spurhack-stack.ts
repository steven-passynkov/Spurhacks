import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

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

        new Domain(this, 'spurhacks', {
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
    }
}