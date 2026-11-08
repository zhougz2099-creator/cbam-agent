import { BellIcon, CloseIcon } from './Icon';

interface PermissionBannerProps {
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export function PermissionBanner({ onOpenSettings, onDismiss }: PermissionBannerProps) {
  return (
    <div className="permission-banner" role="status">
      <span className="permission-banner__icon">
        <BellIcon size={16} />
      </span>
      <div className="permission-banner__body">
        <p>通知权限未开启，到点提醒可能收不到。</p>
        <button type="button" className="text-button" onClick={onOpenSettings}>
          去开启
        </button>
      </div>
      <button
        type="button"
        className="icon-button icon-button--small"
        aria-label="关闭通知引导"
        onClick={onDismiss}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
