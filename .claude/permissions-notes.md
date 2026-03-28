# Local Permissions Notes

- Removed broad permission: `Bash(xargs sed:*)`
- Reason: wildcard `sed` patterns can permit in-place edits via `sed -i`.

If read-only `sed` output is needed in future, request a minimal explicit allow pattern such as:

- `Bash(xargs sed -n '1,120p')`

Do not approve wildcard `sed` patterns or any `sed -i` usage.
