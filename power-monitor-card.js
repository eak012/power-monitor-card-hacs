class PowerMonitorCard extends HTMLElement {
  static async getConfigElement() {
    return document.createElement("power-monitor-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Switch & Power Monitor",
      main_power: "sensor.main_power",
      main_switch: "switch.main",
      devices: [
        { name: "Air Living", switch: "switch.airlivbk", power: "sensor.airlivbk_power", icon: "mdi:sofa" },
        { name: "Air Bed", switch: "switch.airbedr_airbedroom", power: "sensor.airbedr_energy_power", icon: "mdi:bed" },
        { name: "Air Small Bed", switch: "switch.secondbedroom", power: "sensor.secondbedroom_power", icon: "mdi:bed-outline" },
        { name: "Water Pump", switch: "switch.pump_plug", power: "sensor.pump_plug_power", icon: "mdi:water-pump" },
        { name: "Solar Meter", switch: "switch.solarmeter", power: "", icon: "mdi:solar-power-variant" },
        { name: "O₂ Air", switch: "switch.o2", power: "sensor.o2_power", icon: "mdi:air-filter" }
      ]
    };
  }

  setConfig(config) {
    this._config = {
      title: "Switch & Power Monitor",
      devices: [],
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
    return (this._config?.devices?.length || 1) + 2;
  }

  _val(entityId) {
    if (!entityId || !this._hass?.states?.[entityId]) return null;
    const v = parseFloat(this._hass.states[entityId].state);
    return Number.isFinite(v) ? v : null;
  }

  _isOn(entityId) {
    if (!entityId || !this._hass?.states?.[entityId]) return false;
    return ["on", "active", "open"].includes(this._hass.states[entityId].state);
  }

  _formatW(val) {
    if (val === null || val === undefined) return "— W";
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(2)} kW`;
    return `${Math.round(val)} W`;
  }

  _toggle(entityId) {
    if (!this._hass || !entityId) return;
    const domain = entityId.split(".")[0];
    this._hass.callService(domain, "toggle", { entity_id: entityId });
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;
    const cfg = this._config;

    const mainPowerVal = this._val(cfg.main_power);
    const mainSwitchOn = this._isOn(cfg.main_switch);

    const rows = (cfg.devices || []).map((dev) => {
      const isOn = this._isOn(dev.switch);
      const powerVal = dev.power ? this._val(dev.power) : null;
      const stateObj = this._hass.states[dev.switch];
      const name = dev.name || stateObj?.attributes?.friendly_name || dev.switch;
      const icon = dev.icon || stateObj?.attributes?.icon || "mdi:flash";

      return `
        <div class="row-item ${isOn ? "on" : "off"}" data-switch="${dev.switch}">
          <!-- ฝั่งซ้าย: ไอคอน + ชื่ออุปกรณ์ -->
          <div class="device-col">
            <div class="icon-wrap">
              <ha-icon icon="${icon}"></ha-icon>
            </div>
            <div class="text-wrap">
              <div class="device-name">${this._escape(name)}</div>
              <div class="status-badge">
                <span class="dot"></span>
                <span>${isOn ? "ON" : "OFF"}</span>
              </div>
            </div>
          </div>

          <!-- ตรงกลาง: ค่าวัตต์ -->
          <div class="power-col">
            ${dev.power ? `
              <span class="power-val">${this._formatW(powerVal)}</span>
            ` : `
              <span class="no-power">—</span>
            `}
          </div>

          <!-- ฝั่งขวา: สวิตช์ On / Off -->
          <div class="switch-col">
            <ha-switch 
              ${isOn ? "checked" : ""} 
              data-switch="${dev.switch}">
            </ha-switch>
          </div>
        </div>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --c-green: #10b981;
          --c-amber: #f59e0b;
          --c-blue: #0ea5e9;
          --c-text: var(--primary-text-color, #f8fafc);
          --c-sub: var(--secondary-text-color, #94a3b8);
          --c-border: var(--divider-color, rgba(255, 255, 255, 0.08));
        }

        ha-card {
          background: transparent;
          box-shadow: none;
          border: none;
          color: var(--c-text);
          padding: 8px 4px;
        }

        .header-title {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--c-sub);
          margin-bottom: 12px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Top Summary Bar */
        .summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(125, 125, 125, 0.06);
          border: 1px solid var(--c-border);
          border-radius: 14px;
          padding: 10px 16px;
          margin: 0 4px 12px 4px;
        }

        .summary-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-val {
          font-size: 20px;
          font-weight: 800;
          color: var(--c-blue);
        }

        .summary-lbl {
          font-size: 11px;
          font-weight: 600;
          color: var(--c-sub);
          text-transform: uppercase;
        }

        .main-switch-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Rows Container */
        .rows-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Single Row Item: 3 คอลัมน์ชัดเจน */
        .row-item {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid var(--c-border);
          background: rgba(125, 125, 125, 0.04);
          transition: background 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }

        .row-item.on {
          background: color-mix(in srgb, var(--c-green) 6%, transparent);
          border-color: color-mix(in srgb, var(--c-green) 35%, var(--c-border));
        }

        /* Col 1: Icon + Name */
        .device-col {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .icon-wrap {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(125, 125, 125, 0.08);
          color: var(--c-sub);
          transition: 0.2s;
        }

        .row-item.on .icon-wrap {
          color: var(--c-green);
          background: color-mix(in srgb, var(--c-green) 16%, transparent);
        }

        .text-wrap {
          min-width: 0;
        }

        .device-name {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          color: var(--c-sub);
          margin-top: 1px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--c-sub);
        }

        .row-item.on .dot {
          background: var(--c-green);
          box-shadow: 0 0 6px var(--c-green);
        }

        .row-item.on .status-badge {
          color: var(--c-green);
        }

        /* Col 2: Power (Watt) */
        .power-col {
          min-width: 75px;
          text-align: right;
        }

        .power-val {
          font-size: 16px;
          font-weight: 700;
          color: var(--c-amber);
        }

        .row-item.off .power-val {
          color: var(--c-sub);
          opacity: 0.4;
        }

        .no-power {
          color: var(--c-sub);
          opacity: 0.3;
          font-size: 14px;
        }

        /* Col 3: Switch */
        .switch-col {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        ha-switch {
          --switch-checked-button-color: var(--c-green);
          --switch-checked-track-color: color-mix(in srgb, var(--c-green) 40%, transparent);
        }
      </style>

      <ha-card>
        <div class="header-title">
          <ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size: 16px;"></ha-icon>
          <span>${this._escape(cfg.title)}</span>
        </div>

        ${cfg.main_power || cfg.main_switch ? `
          <div class="summary-bar">
            <div class="summary-info">
              <ha-icon icon="mdi:home-lightning-bolt" style="color:var(--c-blue);"></ha-icon>
              <div>
                <div class="summary-val">${this._formatW(mainPowerVal)}</div>
                <div class="summary-lbl">Total Main Load</div>
              </div>
            </div>
            ${cfg.main_switch ? `
              <div class="main-switch-wrap">
                <ha-switch class="main-switch" ${mainSwitchOn ? "checked" : ""}></ha-switch>
              </div>
            ` : ""}
          </div>
        ` : ""}

        <div class="rows-list">
          ${rows}
        </div>
      </ha-card>
    `;

    // Event Listeners
    this.shadowRoot.querySelectorAll(".row-item").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("ha-switch")) return;
        this._toggle(row.dataset.switch);
      });
    });

    this.shadowRoot.querySelectorAll("ha-switch").forEach((sw) => {
      sw.addEventListener("click", (e) => e.stopPropagation());
      sw.addEventListener("change", () => {
        if (sw.classList.contains("main-switch")) {
          this._toggle(cfg.main_switch);
        } else {
          this._toggle(sw.dataset.switch);
        }
      });
    });
  }

  _escape(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

// ----------------------------------------------------
// Visual Form Editor
// ----------------------------------------------------
class PowerMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this._form) {
      this.innerHTML = "";
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        const event = new CustomEvent("config-changed", {
          detail: { config: ev.detail.value },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      });
      this.appendChild(this._form);
    }

    if (this._hass) this._form.hass = this._hass;

    this._form.schema = [
      { name: "title", label: "Card Title", selector: { text: {} } },
      { name: "main_power", label: "Main Power Sensor", selector: { entity: { domain: "sensor" } } },
      { name: "main_switch", label: "Main Switch", selector: { entity: { domain: ["switch", "light", "input_boolean"] } } },
      {
        name: "devices",
        label: "Devices List",
        selector: {
          object: {}
        }
      }
    ];

    this._form.data = this._config;
  }
}

customElements.define("power-monitor-card-editor", PowerMonitorCardEditor);
customElements.define("power-monitor-card", PowerMonitorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "power-monitor-card",
  name: "Power Monitor Card (Row View)",
  description: "Row layout switch and power monitor with theme transparency",
  preview: true
});
