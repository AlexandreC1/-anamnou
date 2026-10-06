import { Link, NavLink, Outlet, useParams } from 'react-router';
import { Suspense } from 'react';
import { useResource, type ClassDetail } from './class-api';
import { classCopy } from './class-copy';
import { yearbookCopy } from './yearbook-copy';
import type { Locale } from './identity-copy';

export function ClassWorkspace({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const result = useResource<ClassDetail>('/classes/' + id);
  const t = yearbookCopy[locale];
  const base = '/classes/' + id;
  return (
    <div className="class-workspace">
      <header className="workspace-header">
        <div className="workspace-context">
          <p className="eyebrow">
            <Link to="/classes">{classCopy[locale].myClasses}</Link>
          </p>
          {result.data && (
            <>
              <p className="workspace-name">{result.data.name}</p>
              <p className="workspace-school">
                {result.data.school.name} · {result.data.graduationYear}
              </p>
            </>
          )}
        </div>
        <p className="workspace-privacy">{classCopy[locale].private}</p>
        <nav className="workspace-nav" aria-label={t.classNavigation}>
          <NavLink to={base} end>
            {t.overview}
          </NavLink>
          {result.data?.permissions.directory && (
            <>
              <NavLink to={base + '/members'} end>
                {t.members}
              </NavLink>
              <NavLink to={base + '/yearbook'}>{t.yearbook}</NavLink>
            </>
          )}
          {result.data?.permissions.contribute && (
            <NavLink to={base + '/members/me/profile'}>{t.yourPage}</NavLink>
          )}
          {result.data?.permissions.manage && (
            <NavLink to={base + '/manage'}>{classCopy[locale].manage}</NavLink>
          )}
        </nav>
      </header>
      <div className="workspace-content">
        <Suspense
          fallback={
            <p className="route-loading" role="status">
              {classCopy[locale].loading}
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
