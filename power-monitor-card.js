class PowerMonitorCard extends HTMLElement {
  static async getConfigElement() {
    return document.createElement("power-monitor-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Switch & Power Monitor",
      columns: 2,
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
      columns: 2,
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
    return 4;
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

    const deviceCards = (cfg.devices || []).map((dev, idx) => {
      const isOn = this._isOn(dev.switch);
      const powerVal = dev.power ? this._val(dev.power) : null;
      const stateObj = this._hass.states[dev.switch];
      const name = dev.name || stateObj?.attributes?.friendly_name || dev.switch;
      const icon = dev.icon || stateObj?.attributes?.icon || "mdi:flash";

      return `
        <div class="tile ${isOn ? "on" : "off"}" data-switch="${dev.switch}">
          <div class="tile-header">
            <div class="icon-box">
              <ha-icon icon="${icon}"></ha-icon>
            </div>
            <div class="tile-title-group">
              <span class="tile-name">${this._escape(name)}</span>
              <span class="status-indicator">
                <span class="pulse-dot"></span>
                ${isOn ? "ON" : "OFF"}
              </span>
            </div>
            <ha-switch 
              class="tile-switch" 
              ${isOn ? "checked" : ""} 
              data-switch="${dev.switch}">
            </ha-switch>
          </div>
          <div class="tile-body">
            <div class="power-metric">
              ${dev.power ? this._formatW(powerVal) : '<span class="no-power">SWITCH ONLY</span>'}
            </div>
          </div>
        </div>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --active-green: #10b981;
          --watt-amber: #f59e0b;
          --main-blue: #0ea5e9;
          --text-main: var(--primary-text-color, #f8fafc);
          --text-sub: var(--secondary-text-color, #94a3b8);
          --card-border: var(--divider-color, rgba(255, 255, 255, 0.08));
        }

        ha-card {
          background: transparent;
          box-shadow: none;
          border: none;
          color: var(--text-main);
          padding: 8px;
        }

        .title-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--text-sub);
          margin-bottom: 14px;
          padding: 0 4px;
        }

        .top-dashboard {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .summary-card {
          background: rgba(125, 125, 125, 0.06);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 14px 16px;
          backdrop-filter: blur(8px);
        }

        .summary-card.interactive {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }

        .summary-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-sub);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .summary-val {
          font-size: 24px;
          font-weight: 800;
          color: var(--main-blue);
          line-height: 1.1;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(${Math.max(1, Number(cfg.columns) || 2)}, minmax(0, 1fr));
          gap: 12px;
        }

        .tile {
          background: rgba(125, 125, 125, 0.05);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.25s ease;
          cursor: pointer;
          min-width: 0;
        }

        .tile.on {
          background: color-mix(in srgb, var(--active-green) 7%, transparent);
          border-color: color-mix(in srgb, var(--active-green) 40%, var(--card-border));
        }

        .tile-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-box {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(125, 125, 125, 0.1);
          color: var(--text-sub);
          transition: 0.2s ease;
        }

        .tile.on .icon-box {
          background: color-mix(in srgb, var(--active-green) 18%, transparent);
          color: var(--active-green);
        }

        .tile-title-group {
          flex: 1;
          min-width: 0;
        }

        .tile-name {
          display: block;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-sub);
          margin-top: 2px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-sub);
        }

        .tile.on .pulse-dot {
          background: var(--active-green);
          box-shadow: 0 0 6px var(--active-green);
        }

        .tile.on .status-indicator {
          color: var(--active-green);
        }

        .tile-switch {
          --switch-checked-button-color: var(--active-green);
          --switch-checked-track-color: color-mix(in srgb, var(--active-green) 40%, transparent);
          transform: scale(0.85);
          transform-origin: right center;
        }

        .tile-body {
          margin-top: 14px;
        }

        .power-metric {
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--watt-amber);
        }

        .tile.off .power-metric {
          color: var(--text-sub);
          opacity: 0.45;
        }

        .no-power {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-sub);
          opacity: 0.6;
          letter-spacing: 0.5px;
        }

        @media (max-width: 440px) {
          .top-dashboard {
            grid-template-columns: 1fr;
          }
          .grid {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <ha-card>
        <div class="title-bar">
          <ha-icon icon="mdi:lightning-bolt"></ha-icon>
          <span>${this._escape(cfg.title)}</span>
        </div>

        ${cfg.main_power || cfg.main_switch ? `
          <div class="top-dashboard">
            ${cfg.main_power ? `
              <div class="summary-card">
                <div class="summary-label">
                  <ha-icon icon="mdi:flash-outline" style="--mdc-icon-size: 14px;"></ha-icon>
                  Total Load Now
                </div>
                <div class="summary-val">${this._formatW(mainPowerVal)}</div>
              </div>
            ` : ""}

            ${cfg.main_switch ? `
              <div class="summary-card interactive" id="main-switch-tile">
                <div>
                  <div class="summary-label">
                    <ha-icon icon="mdi:home-lightning-bolt" style="--mdc-icon-size: 14px;"></ha-icon>
                    Main Power
                  </div>
                  <div style="font-weight:700; font-size:16px; color:${mainSwitchOn ? "var(--active-green)" : "var(--text-sub)"}">
                    ${mainSwitchOn ? "CONNECTED (ON)" : "OFF"}
                  </div>
                </div>
                <ha-switch ${mainSwitchOn ? "checked" : ""}></ha-switch>
              </div>
            ` : ""}
          </div>
        ` : ""}

        <div class="grid">
          ${deviceCards}
        </div>
      </ha-card>
    `;

    // Event Bindings
    this.shadowRoot.querySelectorAll(".tile").forEach((tile) => {
      tile.addEventListener("click", (e) => {
        if (e.target.closest("ha-switch")) return;
        this._toggle(tile.dataset.switch);
      });
    });

    this.shadowRoot.querySelectorAll(".tile-switch").forEach((sw) => {
      sw.addEventListener("click", (e) => e.stopPropagation());
      sw.addEventListener("change", () => this._toggle(sw.dataset.switch));
    });

    const mainTile = this.shadowRoot.querySelector("#main-switch-tile");
    if (mainTile) {
      mainTile.addEventListener("click", () => this._toggle(cfg.main_switch));
    }
  }

  _escape(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

// ------------------------------------------------------------------
// Visual Editor Form
// ------------------------------------------------------------------
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
      { name: "columns", label: "Columns (1 - 4)", selector: { number: { min: 1, max: 4, mode: "box" } } },
      { name: "main_power", label: "Main Total Power Sensor", selector: { entity: { domain: "sensor" } } },
      { name: "main_switch", label: "Main Switch", selector: { entity: { domain: ["switch", "light", "input_boolean"] } } },
      {
        name: "devices",
        label: "Devices (Switch + Power Pairing)",
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
  name: "Power Monitor Card (Unified)",
  description: "Unified Switch and Power Dashboard Card with Theme Transparency",
  preview: true
});
