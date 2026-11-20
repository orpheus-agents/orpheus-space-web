-- Disposable template catalog used for selection and new core sessions.
INSERT INTO templates (id, template_name, tag, agentbox_template_id, description)
VALUES
    ('33333333-3333-4333-8333-333333333333', 'fixture', NULL, 'fixture-standard', 'Standard integration sandbox'),
    ('44444444-4444-4444-8444-444444444444', 'reports', 'v2', 'fixture-reports', 'Tools for reports')
ON CONFLICT (id) DO NOTHING;

INSERT INTO llm_accounts (id, name, harness, provider, auth_mode, credential_store, credential_key)
VALUES ('66666666-6666-4666-8666-666666666666', 'Fixture account', 'codex', 'openai', 'account', 'fixture', 'auth.json'),
('88888888-8888-4888-8888-888888888888', 'OpenCode account', 'opencode', 'opencode', 'account', 'fixture', 'console.json')
ON CONFLICT (id) DO NOTHING;
INSERT INTO model_profiles (id, name, llm_account_id, model, description)
VALUES ('55555555-5555-4555-8555-555555555555', 'default', '66666666-6666-4666-8666-666666666666', 'fixture-model', 'General agent'),
('77777777-7777-4777-8777-777777777777', 'research', '88888888-8888-4888-8888-888888888888', 'research-model', 'Search and compare sources')
ON CONFLICT (id) DO NOTHING;
