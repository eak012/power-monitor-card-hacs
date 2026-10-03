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
        { name: "O₂", switch: "switch.o2", power: "sensor.o2_power", icon: "mdi:air-filter" }
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
    return 3;
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
    if (val === null || val === undefined) return "—";
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
        <div class="row ${isOn ? "on" : "off"}" data-switch="${dev.switch}">
          <!-- คอลัมน์ 1: ไอคอน + ชื่ออุปกรณ์ -->
          <div class="col-name">
            <ha-icon class="row-icon" icon="${icon}"></ha-icon>
            <span class="row-title">${this._escape(name)}</span>
          </div>

          <!-- คอลัมน์ 2: ค่าพลังงานวัตต์ (W) -->
          <div class="col-power">
            ${dev.power ? `<span class="val-w">${this._formatW(powerVal)}</span>` : '<span class="val-none">—</span>'}
          </div>

          <!-- คอลัมน์ 3: สวิตช์ On/Off -->
          <div class="col-switch">
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
          /* สีที่เข้าใจง่ายและใช้ค่าตามธีม */
          --color-on: #10b981;       /* เขียว สดใส สำหรับสถานะเปิด */
          --color-watt: #f59e0b;     /* ส้มอำพัน ชัดเจนสำหรับค่าวัตต์ */
          --color-main: #0ea5e9;     /* ฟ้าสว่าง สำหรับ Main Power */
          --text-main: var(--primary-text-color, #f8fafc);
          --text-sub: var(--secondary-text-color, #94a3b8);
          --line-border: var(--divider-color, rgba(255, 255, 255, 0.08));
        }

        ha-card {
          background: transparent;
          box-shadow: none;
          border: none;
          color: var(--text-main);
          padding: 4px 6px;
        }

        /* ส่วนหัวและ Main Power แบบแถวเดียว ไม่เปลืองที่ */
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px 10px;
          border-bottom: 1px solid var(--line-border);
          margin-bottom: 4px;
        }

        .header-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.3px;
          color: var(--text-sub);
          text-transform: uppercase;
        }

        .header-main-power {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .main-val {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-main);
        }

        /* โครงสร้างแถว Compact Row */
        .row-list {
          display: flex;
          flex-direction: column;
          gap: 2px; /* ลดช่องว่างระหว่างแถวให้แคบมากที่สุด */
        }

        .row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 10px;
          padding: 4px 8px; /* ปรับลด padding แนวตั้งให้แบนราบ */
          border-radius: 8px;
          transition: background 0.15s ease;
          min-height: 38px;
          border-bottom: 1px solid rgba(125, 125, 125, 0.05);
        }

        .row:hover {
          background: rgba(125, 125, 125, 0.04);
        }

        .row.on {
          background: color-mix(in srgb, var(--color-on) 5%, transparent);
        }

        /* คอลัมน์ 1: ไอคอน + ชื่อ */
        .col-name {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .row-icon {
          --mdc-icon-size: 19px;
          color: var(--text-sub);
          flex-shrink: 0;
        }

        .row.on .row-icon {
          color: var(--color-on);
        }

        .row-title {
          font-size: 13.5px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* คอลัมน์ 2: กำลังไฟฟ้า W */
        .col-power {
          min-width: 75px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .val-w {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--color-watt);
        }

        .row.off .val-w {
          color: var(--text-sub);
          opacity: 0.4;
        }

        .val-none {
          color: var(--text-sub);
          opacity: 0.3;
          font-size: 12px;
        }

        /* คอลัมน์ 3: สวิตช์ */
        .col-switch {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 44px;
        }

        ha-switch {
          --switch-checked-button-color: var(--color-on);
          --switch-checked-track-color: color-mix(in srgb, var(--color-on) 40%, transparent);
          transform: scale(0.78);
          transform-origin: right center;
        }
      </style>

      <ha-card>
        <div class="header-bar">
          <span class="header-title">${this._escape(cfg.title)}</span>
          <div class="header-main-power">
            ${cfg.main_power ? `<span class="main-val">${this._formatW(mainPowerVal)}</span>` : ""}
            ${cfg.main_switch ? `
              <ha-switch 
                id="main-switch"
                ${mainSwitchOn ? "checked" : ""}>
              </ha-switch>
            ` : ""}
          </div>
        </div>

        <div class="row-list">
          ${rows}
        </div>
      </ha-card>
    `;

    // ผูก Event สวิตช์แต่ละแถว
    this.shadowRoot.querySelectorAll(".col-switch ha-switch").forEach((sw) => {
      sw.addEventListener("click", (e) => e.stopPropagation());
      sw.addEventListener("change", () => this._toggle(sw.dataset.switch));
    });

    const mainSw = this.shadowRoot.querySelector("#main-switch");
    if (mainSw) {
      mainSw.addEventListener("click", (e) => e.stopPropagation());
      mainSw.addEventListener("change", () => this._toggle(cfg.main_switch));
    }
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
        label: "Devices List (Switch + Power)",
        selector: { object: {} }
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
  name: "Power Monitor Card (Compact List)",
  description: "Ultra-compact row-based switch and power monitor",
  preview: true
});
