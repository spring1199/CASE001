import type { EngineOutcome } from '@/game/engine/engine';

export type RuntimeMutationStage = 'request' | 'persist' | 'apply';

export class RuntimeMutationError extends Error {
  constructor(
    readonly stage: RuntimeMutationStage,
    options?: ErrorOptions,
  ) {
    super(`Runtime mutation failed during ${stage}.`, options);
    this.name = 'RuntimeMutationError';
  }
}

type RuntimeProjection<State> = Readonly<{ state: State }>;

type RuntimeMutationQueueOptions<State> = Readonly<{
  getLatestState(): State;
  persistProjectedState(state: State): Promise<void>;
  onPendingChange(pending: boolean): void;
}>;

/**
 * Serializes every server projection mutation. Each operation reads state only
 * when its queue turn begins, persists the projected state, then publishes UI.
 */
export class RuntimeMutationQueue<
  State,
  Projection extends RuntimeProjection<State>,
> {
  private tail: Promise<void> = Promise.resolve();
  private pendingCount = 0;

  constructor(private readonly options: RuntimeMutationQueueOptions<State>) {}

  enqueue(
    request: (latestState: State) => Promise<Projection>,
    apply: (previousState: State, projection: Projection) => void,
  ): Promise<Projection> {
    this.pendingCount += 1;
    if (this.pendingCount === 1) this.options.onPendingChange(true);

    const execute = async (): Promise<Projection> => {
      const previousState = this.options.getLatestState();
      let projection: Projection;
      try {
        projection = await request(previousState);
      } catch (error) {
        throw new RuntimeMutationError('request', { cause: error });
      }

      try {
        await this.options.persistProjectedState(projection.state);
      } catch (error) {
        throw new RuntimeMutationError('persist', { cause: error });
      }

      try {
        apply(previousState, projection);
      } catch (error) {
        throw new RuntimeMutationError('apply', { cause: error });
      }
      return projection;
    };

    const result = this.tail.then(execute);
    this.tail = result.then(() => undefined, () => undefined);
    return result.finally(() => {
      this.pendingCount -= 1;
      if (this.pendingCount === 0) this.options.onPendingChange(false);
    });
  }
}

const FOCUS_HANDOFF_OUTCOMES: ReadonlySet<EngineOutcome['type']> = new Set([
  'deduction-completed',
  'edges-confirmed',
  'edges-severed',
  'ending-selected',
]);

export function shouldFocusAfterRuntimeOutcomes(outcomes: readonly EngineOutcome[]): boolean {
  return outcomes.some(({ type }) => FOCUS_HANDOFF_OUTCOMES.has(type));
}
