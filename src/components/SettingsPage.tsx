import type { AppSettings, NotificationState } from '../types';
import { ArrowLeftIcon, BellIcon, DeviceIcon, LockIcon } from './Icon';

interface SettingsPageProps {
  settings: AppSettings;
  notification: NotificationState;
  onChangeSettings: (next: AppSettings) => void;
  onRequestPermission: () => void;
  onClose: () => void;
}

const PERMISSION_LABEL: Record<NotificationState, string> = {
  unsupported: '当前浏览器不支持通知',
  default: '尚未开启',
  granted: '已开启',
  denied: '已被拒绝',
};

export function SettingsPage({
  settings,
  notification,
  onChangeSettings,
  onRequestPermission,
  onClose,
}: SettingsPageProps) {
  return (
    <div className="settings-page">
      <div className="settings-page__inner">
        <header className="settings-header">
          <button
            type="button"
            className="icon-button"
            aria-label="返回"
            onClick={onClose}
          >
            <ArrowLeftIcon size={21} />
          </button>
          <h1>设置</h1>
        </header>

        <section className="settings-section" aria-labelledby="settings-reminders">
          <h2 id="settings-reminders">提醒</h2>

          <div className="setting-row">
            <div className="setting-row__copy">
              <p className="setting-row__title">提醒总开关</p>
              <p className="setting-row__hint">关闭后不再触发任何到点提醒。</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.remindersEnabled}
              aria-label="提醒总开关"
              className={`switch${settings.remindersEnabled ? ' is-on' : ''}`}
              onClick={() => onChangeSettings({ ...settings, remindersEnabled: !settings.remindersEnabled })}
            >
              <span className="switch__knob" />
            </button>
          </div>

          <div className="setting-row setting-row--stacked">
            <div className="setting-row__copy">
              <p className="setting-row__title">
                通知权限
                <span className={`status-pill status-pill--${notification}`}>
                  {PERMISSION_LABEL[notification]}
                </span>
              </p>

              {notification === 'default' ? (
                <button type="button" className="outline-button" onClick={onRequestPermission}>
                  <BellIcon size={15} />
                  开启浏览器通知
                </button>
              ) : null}

              {notification === 'denied' ? (
                <p className="setting-row__warning">
                  权限已被浏览器拒绝。请在地址栏的网站设置中允许通知，刷新后再试。
                </p>
              ) : null}

              {notification === 'granted' ? (
                <p className="setting-row__hint">到点时浏览器会弹出通知，点击可直接打开任务。</p>
              ) : null}

              {notification === 'unsupported' ? (
                <p className="setting-row__hint">不支持的浏览器仍会在应用内提醒。</p>
              ) : null}

              <p className="setting-row__hint">
                提醒依赖浏览器：请保持 LightTodo 页面打开。关闭页面或设备休眠后，提醒可能不会触发。
              </p>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-about">
          <h2 id="settings-about">关于</h2>

          <div className="setting-row setting-row--stacked">
            <div className="setting-row__copy">
              <p className="setting-row__title">LightTodo · 轻待办 V0.1.0</p>
              <p className="setting-row__note">
                <DeviceIcon size={16} />
                <span>数据仅存本机，不登录、不上传。</span>
              </p>
              <p className="setting-row__hint">
                换机、卸载或清理浏览器数据后，任务无法恢复。后续版本将优先补上同步能力。
              </p>

              <details className="privacy">
                <summary>隐私政策</summary>
                <div className="privacy__body">
                  <p>本应用不收集、不上传任何个人信息。</p>
                  <p>任务标题、日期与提醒设置只保存在当前设备的浏览器本地存储中。</p>
                  <p>通知权限仅用于到点提醒，不会用于推送其他内容。</p>
                  <p>清除浏览器站点数据或卸载应用会删除全部任务。</p>
                </div>
              </details>

              <p className="setting-row__note setting-row__note--muted">
                <LockIcon size={15} />
                <span>无需账户，离线可用。</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
