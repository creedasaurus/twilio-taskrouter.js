import Configuration from '../../../lib/util/Configuration';
import EnvTwilio from '../../util/EnvTwilio';
import Worker from '../../../lib/Worker';

const chai = require('chai');
chai.use(require('sinon-chai'));
chai.should();
const assert = chai.assert;
const expect = chai.expect;
const sinon = require('sinon');
const credentials = require('../../env');
const JWT = require('../../util/MakeAccessToken');

describe('Common Worker Client', () => {
    const aliceToken = JWT.getAccessToken(credentials.accountSid, credentials.nonMultiTaskWorkspaceSid, credentials.nonMultiTaskAliceSid);
    const bobToken = JWT.getAccessToken(credentials.accountSid, credentials.nonMultiTaskWorkspaceSid, credentials.nonMultiTaskBobSid);
    const envTwilio = new EnvTwilio(credentials.accountSid, credentials.authToken, credentials.env);

    let alice;
    beforeEach(() => {
        return envTwilio.deleteAllTasks(credentials.nonMultiTaskWorkspaceSid).then(() => {
            alice = new Worker(aliceToken, {
                ebServer: `${credentials.ebServer}/v1/wschannels`,
                wsServer: `${credentials.wsServer}/v1/wschannels`,
                logLevel: 'error'
            });
        });
    });

    afterEach(() => {
        alice.removeAllListeners();
        return envTwilio.deleteAllTasks(credentials.nonMultiTaskWorkspaceSid);
    });

    describe('constructor', () => {
        it('should create an instance of Client', () => {
            assert.instanceOf(alice, Worker);
        });

        it('should set correct log level', () => {
            assert.equal(alice._log.getLevel(), 'error');
        });

        it('should create an instance of Configuration', () => {
            assert.instanceOf(alice._config, Configuration);
        });
    });

    describe('#setAttributes(newAttributes)', () => {
        it('should set the attributes of the worker', () => {
            const newAttributes = { languages: ['en'], name: 'Ms. Alice' };

            return new Promise(resolve => {
                alice.on('ready', resolve);
            }).then(() => {
                return alice.setAttributes(newAttributes).then(updatedAlice => {
                    expect(alice).to.equal(updatedAlice);
                    expect(alice.attributes).to.deep.equal(newAttributes);
                });
            });
        }).timeout(5000);

        it('should return an error if unable to set the attributes', () => {
            (() => {
                alice.setAttributes('foo');
            }).should.throw(/attributes is a required parameter/);
        });
    });

    describe('#updateToken(newToken)', () => {
        it('should update the token on the Signaling instance', () => {
            const spy = sinon.spy();
            alice.on('tokenUpdated', spy);

            let updateAliceToken = JWT.getAccessToken(credentials.accountSid, credentials.nonMultiTaskWorkspaceSid, credentials.nonMultiTaskAliceSid);
            alice.updateToken(updateAliceToken);
            assert.equal(alice._config.token, updateAliceToken);
            assert.isTrue(spy.calledOnce);
            assert.isTrue(alice._signaling.reconnect);
        }).timeout(5000);
    });

    describe('should disconnect', () => {
        it('should fire a disconnect event', done => {
            const bob = new Worker(bobToken, {
                ebServer: `${credentials.ebServer}/v1/wschannels`,
                wsServer: `${credentials.wsServer}/v1/wschannels`,
                logLevel: 'info'
            });

            bob.on('ready', () => bob.disconnect());
            bob.on('disconnected', event => {
                assert.equal(event.message, 'SDK Disconnect');
                done();
            });
        });
    });
});
