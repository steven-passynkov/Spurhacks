import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Spurhack } from './spurhack-stack';

const app = new cdk.App();

new Spurhack(app, 'Spurhack', {
    env: {
        account: '532880434953',
        region: 'us-east-1',
    },
});

app.synth();
