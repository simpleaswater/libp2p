'use strict'
/* eslint-disable no-console */

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Node = require('./libp2p_bundle')
const pull = require('pull-stream')
const async = require('async')
const chalk = require('chalk');
const emoji = require('node-emoji')
const Pushable = require('pull-pushable')
const p = Pushable()
let idListener

async.parallel([
    (callback) => {
        PeerId.createFromJSON(require('./ids/earthId'), (err, idDialer) => {
            if (err) {
                throw err
            }
            callback(null, idDialer)
        })
    },
    (callback) => {
        PeerId.createFromJSON(require('./ids/moonId'), (err, idListener) => {
            if (err) {
                throw err
            }
            callback(null, idListener)
        })
    }
], (err, ids) => {
    if (err) throw err
    const peerDialer = new PeerInfo(ids[0])
    peerDialer.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    const nodeDialer = new Node({
        peerInfo: peerDialer
    })

    const peerListener = new PeerInfo(ids[1])
    idListener = ids[1]
    peerListener.multiaddrs.add('/ip4/127.0.0.1/tcp/10333')
    nodeDialer.start((err) => {
        if (err) {
            throw err
        }

        console.log(emoji.get('large_blue_circle'), chalk.blue(' Earth Ready '), emoji.get('headphones'), chalk.blue(' Listening on: '));

        peerListener.multiaddrs.forEach((ma) => {
            console.log(ma.toString() + '/p2p/' + idListener.toB58String())
        })

        nodeDialer.dialProtocol(peerListener, '/chat/1.0.0', (err, conn) => {
            if (err) {
                throw err
            }
            console.log('\n' + emoji.get('large_blue_circle'), chalk.blue(' Earth dialed to Moon on protocol: /chat/1.0.0'));
            console.log(`${emoji.get('incoming_envelope')} ${chalk.bold(`Type a message and press enter. See what happens...`)}`)
            // Write operation. Data sent as a buffer
            pull(
                p,
                conn
            )
            // Sink, data converted from buffer to utf8 string
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),
                pull.drain(console.log)
            )

            process.stdin.setEncoding('utf8')
            process.openStdin().on('data', (chunk) => {
                var data = chunk.toString()
                var data = `${chalk.blue("Message received from Earth: ")}\n\n` + chunk.toString() + `\n${emoji.get('incoming_envelope')}${chalk.blue("  Send message from Moon:")}`
                p.push(data)
            })
        })
    })
})
