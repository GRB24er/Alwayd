import dbConnect from '../src/lib/mongodb';
import User from '../src/models/User';

async function makeAdmin() {
  console.log('Script started...');
  await dbConnect();
  const result = await User.findOneAndUpdate(
    { email: "jp87er@gmail.com" },
    { $set: { role: "admin" } },
    { new: true }
  );
  if (result) {
    console.log("✅ Success:", result.email, "is now admin.");
  } else {
    console.log("❌ User not found.");
  }
  process.exit();
}
makeAdmin();
