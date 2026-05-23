# Deployment

## Git-Based Deploy

Use `scripts/deploy-ops.sh` for normal server updates. The script deploys an exact pushed Git commit, preserves the server `.env`, rebuilds the selected Docker Compose stack, and runs the deployment validator.

Demo stack:

```bash
pnpm deploy:ops:demo
```

Production stack:

```bash
pnpm deploy:ops:prod
```

Custom target:

```bash
bash scripts/deploy-ops.sh --host acerblue --dir /home/trefeon/dev-portfolio/enterprise-ops-monitor --mode demo-db --ref master
```

Dry run:

```bash
bash scripts/deploy-ops.sh --dry-run --host acerblue --dir /home/trefeon/dev-portfolio/enterprise-ops-monitor --mode demo-db
```

Dry run validates local cleanliness, `pnpm check:all`, origin reachability, SSH, remote dependencies, remote `.env`, remote Git state, and Compose config. It does not checkout, upload, restart containers, or change volumes.

## Operator Workflow

1. Make code changes locally.
2. Run `pnpm check:all`.
3. Commit changes.
4. Push commit to `origin`.
5. Run `pnpm deploy:ops:demo` or `pnpm deploy:ops:prod`.

The deploy script also runs `pnpm check:all`; the manual run keeps failures visible before deployment starts.

## Server Requirements

Remote host must have:

- SSH access from the local machine.
- Git checkout at `/home/trefeon/dev-portfolio/enterprise-ops-monitor`.
- Remote origin set to `https://github.com/trefeon/enterprise-ops-monitor.git`.
- `git`, `docker`, `docker compose`, `curl`, and `node`.
- `.env` containing `DB_PASS` and `JWT_SECRET`.

Secrets stay on the server. The deploy script never uploads `.env`.

## Dirty-State Policy

Deploy blocks if the local worktree or remote worktree is dirty. This prevents overwriting uncommitted server edits.

Inspect remote dirty files:

```bash
ssh acerblue "cd /home/trefeon/dev-portfolio/enterprise-ops-monitor && git status --short"
```

Before the first Git-based deploy, clean remote drift by committing it, moving it into the repo through a normal local change, or intentionally discarding it on the server after review. Do not use force reset unless you have confirmed the server-only edits are disposable.

## Modes

- `demo-db`: starts `docker-compose.demo-db.yml`, creates `eom_postgres_demo_data` if missing, stops the production stack without deleting volumes, then runs `node scripts/deploy-check.js --demo`.
- `prod`: stops demo stacks without deleting volumes, creates `eom_postgres_data` if missing, starts `docker-compose.yml`, then runs `node scripts/deploy-check.js`.

Both modes bind services to the existing localhost ports, so only one mode should be active at a time.

## Rollback

Before checkout, the script records the previous remote SHA. If Compose or health validation fails, it checks out the previous SHA and reruns the same mode. The command exits non-zero after a failed deploy even when rollback succeeds.

## Rsync Fallback

Git deploy is the default. Use rsync only for repair or bootstrap:

```bash
bash scripts/deploy-ops.sh --strategy rsync --host acerblue --dir /home/trefeon/dev-portfolio/enterprise-ops-monitor --mode demo-db --ref master
```

Rsync still requires a clean local worktree and a pushed target commit. It excludes `.env`, `.git`, `node_modules`, build outputs, Playwright artifacts, `.lean-ctx`, `.serena`, backups, agent update payloads, and release archives.

For a missing remote checkout, use `--bootstrap` with `--strategy rsync`; the script clones the expected GitHub repo first.
