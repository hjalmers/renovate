const tmp = require('tmp-promise');

const { initRepo } = require('./init');
const { ensureOnboardingPr } = require('./onboarding/pr');
const { handleError } = require('./error');
const { processResult } = require('./result');
const { processRepo } = require('./process');
const { finaliseRepo } = require('./finalise');

module.exports = {
  renovateRepository,
};

// istanbul ignore next
async function renovateRepository(repoConfig) {
  let config = { ...repoConfig };
  logger.setMeta({ repository: config.repository });
  logger.info('Renovating repository');
  logger.trace({ config });
  let tmpDir;
  try {
    if (!config.localDir) {
      // Use an ephemeral directory if none configured
      tmpDir = await tmp.dir({ unsafeCleanup: true });
      config.localDir = tmpDir.path;
    }
    config = await initRepo(config);
    const { res, branches, branchList, packageFiles } = await processRepo(
      config
    );
    await ensureOnboardingPr(config, packageFiles, branches);
    await finaliseRepo(config, branchList);
    return processResult(config, res);
  } catch (err) /* istanbul ignore next */ {
    return processResult(config, await handleError(config, err));
  } finally {
    platform.cleanRepo();
    if (tmpDir) {
      await tmpDir.cleanup();
    }
    logger.info('Finished repository');
  }
}
