import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Construct } from 'constructs';

export class Spurhack extends Stack {

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

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
    }
}