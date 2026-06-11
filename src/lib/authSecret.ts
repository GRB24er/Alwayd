export const AUTH_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  '21b0133285c83665020046259b56217a7a787f1c9dd59fefe496f93dbba6deb2';
