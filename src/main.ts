import * as fs from 'fs';
import * as os from 'os';
import * as buildx from './buildx';
import * as context from './context';
import * as stateHelper from './state-helper';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function run(): Promise<void> {
  try {
    if (os.platform() !== 'linux') {
      core.setFailed('Only supported on linux platform');
      return;
    }

    if (!(await buildx.isAvailable())) {
      core.setFailed(`Buildx is required. See https://github.com/docker/setup-buildx-action to set up buildx.`);
      return;
    }
    stateHelper.setTmpDir(context.tmpDir());

    const buildxVersion = await buildx.getVersion();
    core.info(`📣 Buildx version: ${buildxVersion}`);

    const defContext = context.defaultContext();
    let inputs: context.Inputs = await context.getInputs(defContext);

    core.info(`🏃 Starting build...`);
    const args: string[] = await context.getArgs(inputs, defContext, buildxVersion);
    await exec.exec('docker', args);

    const imageID = await buildx.getImageID();
    if (imageID) {
      core.info('🛒 Extracting digest...');
      core.info(`${imageID}`);
      core.setOutput('digest', imageID);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function cleanup(): Promise<void> {
  if (stateHelper.tmpDir.length > 0) {
    core.info(`🚿 Removing temp folder ${stateHelper.tmpDir}`);
    fs.rmdirSync(stateHelper.tmpDir, {recursive: true});
  }
}

if (!stateHelper.IsPost) {
  run();
} else {
  cleanup();
}
