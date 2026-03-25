import urllib.request, urllib.error, json, sys

pat = "sbp_8b603a0390df8986c91c8cb8d84d70c31d82744f"
ref = "hlrsegapueqyghqwysgv"
base = r"C:\Users\OWNER\Dropbox\Software Development\projects-alpha\supabase\migrations"

for f in ["006_sites_and_roles.sql", "007_custom_project_type.sql"]:
    sql = open(base + "\\" + f, encoding="utf-8").read()
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=body,
        headers={"Authorization": f"Bearer {pat}", "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            print(f"OK: {f}")
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"FAIL: {f} -> {msg}")

print("Done.")
