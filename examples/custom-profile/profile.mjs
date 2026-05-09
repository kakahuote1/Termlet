import {
  defineCommandPack,
  defineProfile,
  filterRecords,
  formatRecords,
  ok,
} from '../../src/index.mjs';

export const labCommands = defineCommandPack('lab-commands', terminal => {
  terminal.register('items', () => ok('', {
    data: [
      { Name: 'decoder', Kind: 'tool', Score: 8 },
      { Name: 'flag-note', Kind: 'note', Score: 3 },
      { Name: 'trace-viewer', Kind: 'tool', Score: 13 },
    ],
  }));

  terminal.register('only', ({ args, input }) => {
    const [property, value] = args;
    return ok('', {
      data: filterRecords(input || [], property, 'eq', value),
    });
  });

  terminal.register('names', ({ input }) => {
    return ok((input || []).map(item => item.Name).join('\n') + '\n');
  });
});

export const labProfile = defineProfile({
  name: 'lab',
  core: {
    basicCommands: false,
    systemCommands: false,
    expandGlobs: false,
    formatPipelineData: data => formatRecords(data, ['Name', 'Kind', 'Score']),
  },
  env: {
    TERMLET_PROFILE: 'lab',
  },
  aliases: {
    i: 'items',
  },
  commandPacks: [labCommands],
});
