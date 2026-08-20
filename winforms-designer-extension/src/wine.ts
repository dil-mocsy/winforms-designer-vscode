/** Wine writes fixme/err/warn chatter to stderr even on success. */
export function stripWineNoise(output: string): string {
    return output
        .split('\n')
        .filter(line => !/^\s*(fixme|err|warn|trace|wine):/i.test(line))
        .join('\n')
        .trim();
}