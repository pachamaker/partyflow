# Docs Registry — Alias Web (PartyFlow)

Этот каталог содержит **канонические** продуктовые и QA документы, а также вспомогательные материалы (архитектура/протоколы/таски).

---

## 1) Source of Truth (канон)

### ✅ Product Requirements (PDR / PRD)
- **docs/pdr.md** — основной документ требований: scope, правила игры, UX flow, ограничения, MVP/non-goals.

> Любые изменения в правилах игры, UX flow, параметрах раунда/скоринга/ролях устройств должны отражаться в `docs/pdr.md`.

### ✅ QA / Quality Bar
- **docs/qa.md** — стратегия тестирования и Definition of Done: уровни тестов, критические сценарии, acceptance criteria.

> Любые изменения в DoD, тестовой пирамиде, критичных сценариях, покрытиях, критериях релиза — в `docs/qa.md`.

---

## 2) Architecture & Protocol (implementation truth)

> Эти документы раскрывают “как реализуем”, но **не должны противоречить** `pdr.md`.
> Если противоречие найдено — сначала уточнить/исправить `pdr.md`, затем синхронизировать архитектуру.

- **docs/partyflow_websocket_architecture.md** — протокол событий, синхронизация состояния, роли устройств, античит (words visibility).
- **docs/agent-task-01-websocket-server.md** — гайд по серверу real-time (если актуален).
- **docs/agent-task-02-state-machine.md** — гайд по state machine.
- **docs/agent-task-03-reconnection.md** — гайд по reconnect/state recovery.

---

## 3) UX / Product Support Docs

- **docs/executive_summary.md** — краткое видение/позиционирование.
- **docs/ux-design-documentation.md** — детальные UX сценарии, edge cases, тексты.

---

## 4) PDFs / Exports

PDF-версии храним как артефакты/экспорт, но **не как единственный источник требований**.
Если есть и PDF и MD, **приоритет у MD**.

- `docs/*.pdf` — архив/экспорт (не canonical).

---

## 5) Reading Order (для агента/разработчика)

### Когда делаешь продуктовую фичу или меняешь правила
1) `pdr.md`
2) `qa.md`
3) `partyflow_websocket_architecture.md`
4) соответствующие agent-task-*.md (если релевантно)

### Когда правишь reconnect / sync / WS протокол
1) `partyflow_websocket_architecture.md`
2) `pdr.md` (проверить, что UX/правила не ломаются)
3) `qa.md` (добавить/обновить критические сценарии)
4) agent-task-03-reconnection.md

### Когда правишь тесты / качество / релизные критерии
1) `qa.md`
2) `pdr.md` (сопоставить с acceptance criteria и core loop)

---

## 6) Update Policy (что обновлять при изменениях)

- Меняешь **правила/flow/UX** → обнови `pdr.md` + при необходимости `ux-design-documentation.md`.
- Меняешь **протокол/ивенты/синхронизацию** → обнови `partyflow_websocket_architecture.md` + синхронизируй типы/контракты в коде.
- Меняешь **DoD/покрытия/критичные сценарии** → обнови `qa.md`.

---

## 7) Quick Links (опционально)

- Root agent instructions: `../AGENTS.md`
- Frontend agent instructions: `../frontend/FRONTEND_AGENT.md`
- Backend agent instructions: `../backend/BACKEND_AGENT.md`