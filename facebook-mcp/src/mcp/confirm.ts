import { errorMessageOf } from '../core/index.js';
import type {
  ConfirmationRequest,
  ConfirmationResponse,
  Confirmer,
  Settings,
} from '../core/index.js';

export interface ElicitOutcome {
  readonly confirmed: boolean;
  readonly note?: string;
}
export type ElicitCapability = (request: ConfirmationRequest) => Promise<ElicitOutcome>;
export type OperatorTokenResolver = (
  request: ConfirmationRequest,
) => string | undefined | Promise<string | undefined>;
export interface ConfirmerDeps {
  readonly elicit?: ElicitCapability;
  /** Kept for embedder compatibility; confirmation passwords are deliberately ignored. */
  readonly settings: Pick<Settings, 'confirmToken'>;
  readonly resolveOperatorToken?: OperatorTokenResolver;
}
export function createConfirmer(deps: ConfirmerDeps): Confirmer {
  return {
    async confirm(request: ConfirmationRequest): Promise<ConfirmationResponse> {
      if (!deps.elicit)
        return {
          confirmed: false,
          method: 'denied',
          note: 'Required human approval is unavailable. Token fallback is disabled.',
        };
      try {
        const answer = await deps.elicit(request);
        return {
          confirmed: answer?.confirmed === true,
          method: 'elicitation',
          ...(typeof answer?.note === 'string' ? { note: answer.note } : {}),
        };
      } catch (error) {
        return {
          confirmed: false,
          method: 'denied',
          note: `Human approval failed: ${errorMessageOf(error)}`,
        };
      }
    },
  };
}
