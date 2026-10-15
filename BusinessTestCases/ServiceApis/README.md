# ServiceApis — generated API scaffolds

Auto-generated from the 28 EMI OpenAPI specs behind the UAT gateway swagger-ui
(`https://gateway-uat.majdpay.com/webjars/swagger-ui` — "Select a definition").
One `<Service>.generated.spec.ts` per service, mirrored by one
`postman/<Service>-API-majdpay.postman_collection.json`.

These are **scaffolds, not curated coverage**. Every operation is a
`test.skip(true, ...)` placeholder so the surface is tracked and greppable;
turning one into a real test means adding request fixtures and assertions and
moving it into (or referencing it from) the owning feature folder. Same
"tracked but not yet runnable" rationale as `Reconciliation/` and
`TransactionOperations/`.

## Running

Nothing here registers during a normal `npm run test:dev` — the `test.describe`
blocks are wrapped in `if (SERVICE_API_SCAFFOLD || SERVICE_API_SMOKE)`.

| Env var | Effect |
|---|---|
| `SERVICE_API_SCAFFOLD=true` | registers the skipped placeholders so they show in the report / `--list` |
| `SERVICE_API_SMOKE=true` | also runs the live "unauthenticated request is rejected" check for every path-param-free operation |
| `API_BASE_URL` | gateway origin (default `https://gateway-dev.majdpay.com`); each spec appends its own service path |

```bash
cross-env ENV=dev SERVICE_API_SMOKE=true npx playwright test BusinessTestCases/ServiceApis
```

## Services

| Service slug | Operations | Playwright scaffold | Base path |
|---|--:|---|---|
| `profile-service` | 160 | `ProfileService.generated.spec.ts` | `/profile-service` |
| `wallet-service` | 91 | `WalletService.generated.spec.ts` | `/wallet-service` |
| `authentication-service` | 86 | `AuthenticationService.generated.spec.ts` | `/authentication-service` |
| `product-management-service` | 79 | `ProductManagementService.generated.spec.ts` | `/product-management-service` |
| `ebill-service` | 58 | `EbillService.generated.spec.ts` | `/ebill-service` |
| `bank-integration` | 53 | `BankIntegration.generated.spec.ts` | `/bank-integration` |
| `emi-external-integration` | 53 | `EmiExternalIntegration.generated.spec.ts` | `/emi-external%20integration` |
| `close-loop-orchestrator` | 50 | `CloseLoopOrchestrator.generated.spec.ts` | `/transaction-service` |
| `beneficiary-management` | 24 | `BeneficiaryManagement.generated.spec.ts` | `/beneficiary-management` |
| `reports-service` | 24 | `ReportsService.generated.spec.ts` | `/reports` |
| `attachment-service` | 22 | `AttachmentService.generated.spec.ts` | `/attachment-service` |
| `translation-service` | 21 | `TranslationService.generated.spec.ts` | `/translation-service` |
| `faq-service` | 18 | `FaqService.generated.spec.ts` | `/faq-service` |
| `controls-rules-service` | 16 | `ControlsRulesService.generated.spec.ts` | `/controls-rules-service` |
| `integration-service` | 16 | `IntegrationService.generated.spec.ts` | `/integration-service` |
| `configuration-management-service` | 15 | `ConfigurationManagementService.generated.spec.ts` | `/configuration-management-service` |
| `device-management` | 15 | `DeviceManagement.generated.spec.ts` | `/device-management` |
| `transaction-command-log-service` | 15 | `TransactionCommandLogService.generated.spec.ts` | `/transaction-command-log-service` |
| `risk-management-service` | 13 | `RiskManagementService.generated.spec.ts` | `/risk-management-service` |
| `commission-service` | 12 | `CommissionService.generated.spec.ts` | `/commission-service` |
| `otp-service` | 11 | `OtpService.generated.spec.ts` | `/otp-service` |
| `aml-integration-service` | 10 | `AmlIntegrationService.generated.spec.ts` | `/aml-integration-service` |
| `transaction-query-log-service` | 6 | `TransactionQueryLogService.generated.spec.ts` | `/profile-service` |
| `erp-integration-service` | 4 | `ErpIntegrationService.generated.spec.ts` | `/erp-integration-service` |
| `user-registration-service` | 3 | `UserRegistrationService.generated.spec.ts` | `/user-registration-service` |
| `middleware-service` | 1 | `MiddlewareService.generated.spec.ts` | `/middleware` |
| `notifications-log` | 1 | `NotificationsLog.generated.spec.ts` | `/notifications-log` |

Empty specs (no paths — nothing generated): `api-gateway`, `reconciliation-management-service`, `reconciliation-processor`.

## Postman

Import `postman/EMI-dev.postman_environment.json` once, then any
`postman/<Service>-API-majdpay.postman_collection.json`. Set `token` (and, for
the Authentication Service sign-in, `username` / `password` / `tenantNumber`).
Request bodies are schema-derived placeholders — edit before sending.

```bash
npx --yes newman run postman/AuthenticationService-API-majdpay.postman_collection.json -e postman/EMI-dev.postman_environment.json --env-var token=YOUR_JWT
```
