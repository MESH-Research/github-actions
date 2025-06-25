import { c as coreExports, r as run } from './action-DyNcmWR7.js';
import 'os';
import 'crypto';
import 'fs';
import 'path';
import 'http';
import 'https';
import 'net';
import 'tls';
import 'assert';
import 'util';
import 'stream';
import 'buffer';
import 'querystring';
import 'stream/web';
import 'node:stream';
import 'node:util';
import 'node:events';
import 'worker_threads';
import 'perf_hooks';
import 'util/types';
import 'async_hooks';
import 'console';
import 'url';
import 'zlib';
import 'diagnostics_channel';
import 'child_process';
import 'timers';

const inputs = {
    'docker-metadata': coreExports.getInput('docker-metadata'),
    'bake-files': coreExports.getInput('bake-files'),
    target: coreExports.getInput('target'),
    command: coreExports.getInput('command', { required: true })
};
run('pre', inputs);
//# sourceMappingURL=pre.js.map
