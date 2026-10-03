class PowerMonitorCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("power-monitor-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Switch & Power Monitor",
      entities: [],
      columns: 2,
      show_total: true,
      show_main_switch: true
    };
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.entities)) {
      throw new Error("power-monitor-card: 'entities' must be an array");
    }

    this._config = {
      title: "Switch & Power Monitor",
      columns: 2,
      show_total: true,
      show_main_switch: true,
      ...config
    };

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) this._render();
  }

  getCardSize() {
    return 4;
  }

  _state(entity) {
    return this._hass?.states?.[entity];
  }

  _friendlyName(entityId, fallback) {
    const state = this._state(entityId);
    return fallback || state?.attributes?.friendly_name || entityId;
  }

  _powerValue(entityId) {
    const state = this._state(entityId);
    if (!state) return null;

    const value = Number.parseFloat(state.state);
    if (!Number.isFinite(value)) return null;
    return value;
  }

  _formatPower(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return "— W";
    }

    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(2)} kW`;
    }

    return `${Math.round(value)} W`;
  }

  _formatMainPower(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return "—";
    }

    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(2)} kW`;
    }

    return `${Math.round(value)} W`;
  }

  _icon(icon) {
    return icon || "mdi:flash";
  }

  _isOn(entityId) {
    const state = this._state(entityId);
    return ["on", "open", "active", "playing"].includes(state?.state);
  }

  _toggle(entityId) {
    if (!this._hass || !entityId) return;

    const domain = entityId.split(".")[0];
    if (!["switch", "light", "input_boolean"].includes(domain)) return;

    this._hass.callService(domain, "toggle", {
      entity_id: entityId
    });
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;

    const cfg = this._config;
    const mainPower = cfg.main_power?.entity
      ? this._powerValue(cfg.main_power.entity)
      : null;

    const cards = cfg.entities.map((item, index) => {
      const isOn = this._isOn(item.entity);
      const power = item.power ? this._powerValue(item.power) : null;
      const name = this._friendlyName(item.entity, item.name);
      const icon = this._icon(item.icon);

      return `
        <div class="device ${isOn ? "on" : "off"}" data-index="${index}">
          <div class="device-top">
            <div class="icon-wrap">
              <ha-icon icon="${icon}"></ha-icon>
            </div>
            <div class="device-info">
              <div class="name">${this._escape(name)}</div>
              <div class="status">
                <span class="dot"></span>
                <span>${isOn ? "ON" : "OFF"}</span>
              </div>
            </div>
            <ha-switch
              class="device-switch"
              ${isOn ? "checked" : ""}
              data-index="${index}">
            </ha-switch>
          </div>

          <div class="power">
            ${this._formatPower(power)}
          </div>
        </div>
      `;
    }).join("");

    const mainSwitchEntity = cfg.main_switch?.entity;
    const mainSwitchOn = mainSwitchEntity ? this._isOn(mainSwitchEntity) : false;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          /* Color Scheme: เข้าใจง่ายและเป็นมิตรกับธีม */
          --pm-primary: var(--primary-color, #0284c7);
          --pm-text: var(--primary-text-color, #f1f5f9);
          --pm-secondary: var(--secondary-text-color, #94a3b8);
          --pm-border: var(--divider-color, rgba(255, 255, 255, 0.12));
          --pm-on-color: #10b981;    /* เขียว สดใส สื่อถึงสถานะกำลังทำงาน */
          --pm-power-color: #f59e0b; /* ส้มอมทอง สื่อถึงค่ากำลังไฟฟ้า/การบริโภคพลังงาน */
          --pm-main-power: #38bdf8;  /* ฟ้าสว่าง ชัดเจนสำหรับกำลังไฟรวม */
          --pm-radius: 18px;
        }

        ha-card {
          /* ใช้สีพื้นหลังของธีม 100% */
          background: transparent;
          color: var(--pm-text);
          border-radius: var(--pm-radius);
          box-shadow: none;
          border: none;
          padding: 8px 4px;
        }

        .header {
          padding: 8px 12px 16px;
        }

        .title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title {
          font-size: 17px;
          font-weight: 600;
          color: var(--pm-text);
          opacity: 0.9;
        }

        .total {
          margin-top: 6px;
          font-size: 28px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.5px;
          color: var(--pm-main-power);
        }

        .total-label {
          color: var(--pm-secondary);
          font-size: 11px;
          margin-top: 3px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.8px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(${Math.max(1, Number(cfg.columns) || 2)}, minmax(0, 1fr));
          gap: 10px;
          padding: 0 4px 10px;
        }

        .device {
          min-width: 0;
          background: rgba(125, 125, 125, 0.05);
          border: 1px solid var(--pm-border);
          border-radius: 14px;
          padding: 12px;
          box-sizing: border-box;
          transition: border-color .2s ease, background .2s ease;
          cursor: pointer;
        }

        .device.on {
          border-color: color-mix(in srgb, var(--pm-on-color) 45%, var(--pm-border));
          background: color-mix(in srgb, var(--pm-on-color) 7%, transparent);
        }

        .device-top {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 8px;
        }

        .icon-wrap {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(125, 125, 125, 0.1);
          color: var(--pm-secondary);
        }

        .device.on .icon-wrap {
          color: var(--pm-on-color);
          background: color-mix(in srgb, var(--pm-on-color) 18%, transparent);
        }

        ha-icon {
          --mdc-icon-size: 20px;
        }

        .device-info {
          min-width: 0;
          flex: 1;
        }

        .name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--pm-text);
        }

        .status {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
          color: var(--pm-secondary);
          font-size: 10px;
          font-weight: 700;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--pm-secondary);
        }

        .device.on .dot {
          background: var(--pm-on-color);
          box-shadow: 0 0 6px var(--pm-on-color);
        }

        .device.on .status {
          color: var(--pm-on-color);
        }

        .power {
          margin-top: 12px;
          font-size: 20px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: var(--pm-power-color);
        }

        .device.off .power {
          color: var(--pm-secondary);
          opacity: 0.45;
        }

        .device-switch {
          --switch-checked-button-color: var(--pm-on-color);
          --switch-checked-track-color: color-mix(in srgb, var(--pm-on-color) 40%, transparent);
          transform: scale(.8);
          transform-origin: right center;
        }

        .main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 6px 4px 6px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--pm-border);
          background: rgba(125, 125, 125, 0.05);
        }

        .main-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .main-icon {
          color: var(--pm-primary);
        }

        .main-title {
          font-size: 13px;
          font-weight: 600;
        }

        .main-power {
          margin-top: 2px;
          color: var(--pm-secondary);
          font-size: 11px;
          font-weight: 600;
        }

        .main-switch {
          --switch-checked-button-color: var(--pm-primary);
          --switch-checked-track-color: color-mix(in srgb, var(--pm-primary) 40%, transparent);
        }

        @media (max-width: 380px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title-row">
            <div class="title">${this._escape(cfg.title)}</div>
          </div>
          ${cfg.show_total && cfg.main_power?.entity ? `
            <div class="total">${this._formatMainPower(mainPower)}</div>
            <div class="total-label">Power Now</div>
          ` : ""}
        </div>

        <div class="grid">
          ${cards}
        </div>

        ${cfg.show_main_switch && mainSwitchEntity ? `
          <div class="main">
            <div class="main-left">
              <ha-icon class="main-icon" icon="mdi:home-lightning-bolt"></ha-icon>
              <div>
                <div class="main-title">Main Power</div>
                <div class="main-power">${mainSwitchOn ? "ON" : "OFF"}</div>
              </div>
            </div>
            <ha-switch class="main-switch" ${mainSwitchOn ? "checked" : ""}></ha-switch>
          </div>
        ` : ""}
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".device").forEach((el) => {
      el.addEventListener("click", (ev) => {
        if (ev.target.closest("ha-switch")) return;
        const index = Number(el.dataset.index);
        this._toggle(cfg.entities[index]?.entity);
      });
    });

    this.shadowRoot.querySelectorAll(".device-switch").forEach((sw) => {
      sw.addEventListener("click", (ev) => {
        ev.stopPropagation();
      });
      sw.addEventListener("change", (ev) => {
        const index = Number(sw.dataset.index);
        this._toggle(cfg.entities[index]?.entity);
      });
    });

    const mainSwitch = this.shadowRoot.querySelector(".main-switch");
    if (mainSwitch) {
      mainSwitch.addEventListener("change", () => this._toggle(mainSwitchEntity));
    }
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

customElements.define("power-monitor-card", PowerMonitorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "power-monitor-card",
  name: "Power Monitor Card",
  description: "Compact 2-column switch and power monitor card",
  preview: true
});

console.info(
  "%c POWER-MONITOR-CARD %c 1.0.0 ",
  "color:white;background:#0284c7;font-weight:bold;",
  "color:#0284c7;background:transparent;font-weight:bold;"
);