The `ig-*` skills in this folder are copied unchanged from
https://github.com/Jakeschincariol/instagram-agent-skill (commit d03c56b, MIT licence,
see IG-AGENT-LICENSE). Checked before install: Python standard library only, no network,
no shell commands, and the instructions forbid logging in, auto-posting and automated
engagement. To update, copy the folders again from a newer commit and re-check.

They read the account's voice from `~/.claude/instagram/voice.md`. The real file lives in
this repo at `docs/instagram-voice.md`; copy it there before using the skills:

    mkdir -p ~/.claude/instagram && cp docs/instagram-voice.md ~/.claude/instagram/voice.md
