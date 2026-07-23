# GitHub Actions → Plesk

โปรเจกต์นี้ build เป็น Vinext standalone Node.js bundle แล้ว deploy ไปยัง:

```text
/var/www/vhosts/labedu.tech/httpdocs/admin.labedu.tech
```

ทุกครั้งที่ push เข้า branch `main` workflow จะ lint, test, build, rsync ไฟล์ขึ้น
Plesk และ restart แอปผ่าน Passenger โดยอัตโนมัติ

## 1. ตั้งค่า Node.js ใน Plesk ครั้งแรก

ไปที่ **Websites & Domains → admin.labedu.tech → Node.js** แล้วกำหนด:

| รายการ | ค่า |
| --- | --- |
| Node.js version | `22.x` |
| Application mode | `Production` |
| Application root | `httpdocs/admin.labedu.tech` |
| Document root | `httpdocs/admin.labedu.tech/dist/client` |
| Application startup file | `server.js` |

ยังไม่ต้องกด Enable จนกว่า workflow จะ deploy ครั้งแรก เพราะ `server.js` จะถูกสร้าง
ระหว่าง build

`NEXT_PUBLIC_API_URL` ถูกฝังลง JavaScript ตอน build จึงต้องตั้งเป็น GitHub Secret
ไม่ใช่เฉพาะ Environment Variable ใน Plesk

## 2. สร้าง SSH deploy key

สร้าง key บนเครื่องของผู้ดูแล ห้ามสร้างบน GitHub runner:

```bash
ssh-keygen -t ed25519 -C "github-actions-admin-sc-exam" -f ./admin_sc_exam_plesk
```

เพิ่ม public key ให้ผู้ใช้ Plesk:

```bash
ssh-copy-id -i ./admin_sc_exam_plesk.pub admin_lebedu@118.27.146.122
```

ถ้าเซิร์ฟเวอร์ปิด `ssh-copy-id` ให้นำเนื้อหาไฟล์
`admin_sc_exam_plesk.pub` ไปเพิ่มใน `~/.ssh/authorized_keys` ของ `admin_lebedu`
และตรวจว่าผู้ใช้นี้เขียน path deploy ได้

ทดสอบก่อน:

```bash
ssh -i ./admin_sc_exam_plesk admin_lebedu@118.27.146.122 \
  "test -w /var/www/vhosts/labedu.tech/httpdocs/admin.labedu.tech"
```

## 3. เพิ่ม GitHub Secrets

ที่ repository
**Settings → Secrets and variables → Actions → New repository secret** เพิ่ม:

| Secret | ค่า |
| --- | --- |
| `PLESK_SSH_PRIVATE_KEY` | เนื้อหาทั้งหมดของไฟล์ `admin_sc_exam_plesk` |
| `PLESK_SSH_KNOWN_HOSTS` | ผลลัพธ์เต็มบรรทัดจากคำสั่ง `ssh-keyscan` ด้านล่าง |
| `NEXT_PUBLIC_API_URL` | Production API URL เช่น `https://api.labedu.tech/api/v1` |

สร้างค่า known hosts:

```bash
ssh-keyscan -p 22 -t ed25519,rsa 118.27.146.122
```

ก่อนบันทึกควรยืนยัน host-key fingerprint กับผู้ดูแลเซิร์ฟเวอร์ Plesk โดยค่าที่
ตรวจพบจากเครือข่ายในวันที่ 23 กรกฎาคม 2026 คือ:

```text
ED25519 SHA256:zoxACkj4j0iMxJCxrD/41UsKV7+oDkMe1mhI/UoImwY
RSA     SHA256:dS5nSeFo+MdxoOwm6WuNhPC9HnkGvJdJBS9gLZ+OYw0
```

ถ้า SSH ไม่ได้ใช้ port `22` ให้เพิ่ม Repository variable ชื่อ
`PLESK_SSH_PORT` และใช้ port นั้นตอน `ssh-copy-id`/`ssh-keyscan` ด้วย

## 4. Deploy ครั้งแรก

push โค้ดขึ้น `main` หรือไปที่
**Actions → CI/CD to Plesk → Run workflow** หลัง workflow สำเร็จ กลับไป Plesk
และกด **Enable Node.js**

การ deploy ครั้งต่อไปจะ restart แอปอัตโนมัติด้วย:

```text
httpdocs/admin.labedu.tech/tmp/restart.txt
```

## ตรวจปัญหา

- `Permission denied`: ตรวจ deploy key, shell access และสิทธิ์เขียน document root
- `Host key verification failed`: สร้าง `PLESK_SSH_KNOWN_HOSTS` ใหม่
  หลังยืนยันว่าเซิร์ฟเวอร์มีการเปลี่ยน host key จริง
- `502/503`: ตรวจว่า Plesk ใช้ Node.js 22, startup file เป็น `server.js`
  และดู **Websites & Domains → admin.labedu.tech → Logs**
- หน้าเว็บเปิดได้แต่เรียก API ไม่ได้: ตรวจ `NEXT_PUBLIC_API_URL`, HTTPS และ CORS
  ของ API แล้ว re-run workflow เพราะค่านี้ถูกฝังตอน build
