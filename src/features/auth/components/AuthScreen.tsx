import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './auth.module.css';

/** 로그인·회원가입 공통 화면 틀 (하단 탭·계정 메뉴 없는 단독 화면) */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.screen}>
      <main className={styles.panel}>
        <Link to="/login" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            P
          </span>
          포인트
        </Link>
        <div>
          <h1 className={styles.heading}>{title}</h1>
          {subtitle && <p className={styles.sub}>{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

export function SessionSplash() {
  return (
    <div className={styles.splash} role="status">
      불러오는 중…
    </div>
  );
}
