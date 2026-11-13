-- Disposable catalog fixtures; independent of the TOML runtime allowlist.
INSERT INTO templates (id, template_name, tag, agentbox_template_id, description)
VALUES
    ('33333333-3333-4333-8333-333333333333', 'fixture', NULL, 'fixture-standard', 'Standard integration sandbox'),
    ('44444444-4444-4444-8444-444444444444', 'reports', 'v2', 'fixture-reports', 'Tools for reports')
ON CONFLICT (id) DO NOTHING;
