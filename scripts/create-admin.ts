import readline from 'readline';
import { db } from '../server/db.js';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log('\n=============================================');
  console.log('👑 CÔNG CỤ TẠO TÀI KHOẢN ADMIN (QUẢN TRỊ VIÊN)');
  console.log('=============================================\n');

  const args = process.argv.slice(2);
  let username = args[0];
  let password = args[1];
  let name = args[2];

  if (!username) {
    username = await askQuestion('👉 Nhập tên đăng nhập Admin (username): ');
  }
  if (!password) {
    password = await askQuestion('👉 Nhập mật khẩu Admin (password): ');
  }
  if (!name) {
    name = await askQuestion('👉 Nhập họ và tên hiển thị (name): ');
  }

  if (!username || username.length < 3) {
    console.error('❌ Lỗi: Tên đăng nhập phải có ít nhất 3 ký tự.');
    process.exit(1);
  }
  if (!password || password.length < 4) {
    console.error('❌ Lỗi: Mật khẩu phải có ít nhất 4 ký tự.');
    process.exit(1);
  }
  if (!name) {
    name = 'Quản trị viên ' + username;
  }

  const existing = db.findUserByUsername(username);
  if (existing) {
    console.log(`\n⚠️  Tài khoản "${username}" đã tồn tại trên hệ thống.`);
    console.log(`Đang nâng cấp tài khoản này lên quyền Admin và cập nhật mật khẩu mới...`);
    db.updateUser(existing.id, {
      name,
      password,
      role: 'admin',
    });
    console.log(`\n✅ NÂNG CẤP ADMIN THÀNH CÔNG!`);
    console.log(`- Tên đăng nhập : ${username}`);
    console.log(`- Mật khẩu      : ${password}`);
    console.log(`- Họ và tên     : ${name}`);
    console.log(`- Vai trò       : admin (Quản trị viên)\n`);
    process.exit(0);
  }

  const newAdmin = db.createUser({
    username,
    password,
    name,
    role: 'admin',
  });

  console.log(`\n✅ TẠO TÀI KHOẢN ADMIN THÀNH CÔNG!`);
  console.log(`- ID            : ${newAdmin.id}`);
  console.log(`- Tên đăng nhập : ${newAdmin.username}`);
  console.log(`- Mật khẩu      : ${newAdmin.password}`);
  console.log(`- Họ và tên     : ${newAdmin.name}`);
  console.log(`- Vai trò       : admin (Quản trị viên)`);
  console.log(`- Ngày tạo      : ${newAdmin.createdAt}\n`);
  console.log(`👉 Bạn có thể đăng nhập ngay tại trang Đăng nhập trên website!\n`);
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
