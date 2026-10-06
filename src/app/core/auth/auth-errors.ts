export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'بيانات الدخول غير صحيحة. تحقق من الحساب وكلمة المرور.';
    case 'auth/user-disabled':
      return 'هذا الحساب معطّل. تواصل مع المسؤول.';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال. تحقق من الإنترنت ثم حاول مرة أخرى.';
    default:
      return 'تعذر إكمال العملية. حاول مرة أخرى.';
  }
}
