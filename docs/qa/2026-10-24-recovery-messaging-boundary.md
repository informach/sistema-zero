# Recovery messaging boundary

Payments now has a bounded HMAC adapter for Messaging send, receipt lookup and queued-message withdrawal. Responses are streamed with a 64 KiB limit and a deadline covering headers and body. The adapter accepts only validated minimal receipts, checks returned message identity, rejects inconsistent suppression claims, never retries by itself and replaces raw network/provider exceptions with a generic domain error. No card token or credential is part of a notification.

The Gateway consumer registry supports optional route capabilities. An explicit empty list denies all routes; an omitted list preserves existing consumers' behavior. The new conditional `payments` consumer has exactly `messaging-send`, `messaging-message-get` and `messaging-message-suppress`. A valid signature alone cannot authorize another route. Capability lists are copied and frozen, so mutating the loaded configuration does not broaden a live consumer.

Fresh local evidence:

- Causal Gateway test before implementation: 1 pass, 3 failures; denied routes were incorrectly accepted.
- Gateway suite: 289 pass, 2 Redis-dependent tests skipped, 0 failures, 1,210 assertions.
- Payments adapter: 4 pass, 19 assertions; includes a real local HTTP response whose body never completes and is aborted within the configured deadline.
- Gateway and Payments TypeScript checks: exit 0, Node with 1 GiB heap, serial execution.
- Biome: 11 changed source/test paths clean after formatting.

This is transport and authorization preparation. It is not activation of recovery, proof of email delivery, or qualification of D7 cancellation. No production variables, real customer communication or real financial action were changed for this lot. Durable notice records, orchestration, templates, policy UI, sandbox qualification and the two full reviews remain separate work.
