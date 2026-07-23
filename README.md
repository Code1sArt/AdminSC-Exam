# Lab EDU Admin Panel

หน้าจอผู้ดูแลระบบสำหรับแพลตฟอร์มวัดผลด้วย AI พัฒนาด้วย React, Vite/Vinext, Tailwind CSS และ SweetAlert2

## ความสามารถ

- เข้าสู่ระบบด้วยบัญชี `ADMIN` จาก Lab EDU API
- Dashboard แสดงนักเรียน ห้องเรียน ข้อสอบ ชุดข้อสอบ และกลุ่มผู้เรียน
- เพิ่มนักเรียน ครู ห้องเรียน วิชา และตัวชี้วัด
- นำเข้านักเรียนจากไฟล์ `.xlsx`
- ดูธนาคารข้อสอบและสร้างข้อสอบด้วย AI
- สร้างและเผยแพร่ชุดข้อสอบ Adaptive
- AI Insights และสถานะการเชื่อมต่อระบบ
- Responsive สำหรับ desktop, tablet และ mobile

## เริ่มใช้งาน

API ต้องทำงานที่ port `3000` ก่อน:

```bash
cd ../api
npm run start:dev
```

จากนั้นเปิด Admin Panel ที่ port `5173`:

```bash
cd ../admin-panel
npm install
npm run dev
```

เปิด `http://localhost:5173`

บัญชี demo:

- Email: `admin@demo.local`
- Password: `Demo1234!`

เปลี่ยน API URL ได้ใน `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api/v1
```

## ตรวจสอบโปรเจกต์

```bash
npm run build
npm run lint
npm test
```

## CI/CD ไป Plesk

คู่มือการตั้งค่า Plesk, SSH deploy key และ GitHub Secrets อยู่ที่
[`docs/PLESK_CICD.md`](docs/PLESK_CICD.md)
