import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogout } from '@/features/auth/api/useAuth';
import { useCurrentUser } from '@/shared/auth/session';
import { Icon } from '@/shared/ui/Icon';
import styles from './Layout.module.css';

/** 계정 메뉴: 로그인 사용자 정보 + 관리자 콘솔 진입점 + 로그아웃 */
export function AccountMenu() {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.account} ref={ref}>
      <button
        type="button"
        className={styles.accountButton}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.accountName}>{user.name}</span>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuProfile}>
            <span className={styles.avatar} aria-hidden="true">
              {initial}
            </span>
            <div className={styles.menuProfileText}>
              <p className={styles.menuProfileName}>{user.name}</p>
              <p className={styles.menuProfileEmail}>{user.email}</p>
            </div>
          </div>
          <div className={styles.menuDivider} />
          <Link
            to="/admin"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => setOpen(false)}
          >
            <Icon name="settings" size={18} />
            관리자 콘솔
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
            }
          >
            <Icon name="logout" size={18} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
