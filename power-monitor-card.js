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
        { name: "Air Living", switch: "switch.airlivbk", power: "sensor.airlivbk_power", secondary_info: "last-changed", icon: "mdi:sofa" },
        { name: "Air Bed", switch: "switch.airbedr_airbedroom", power: "sensor.airbedr_energy_power", secondary_info: "none", icon: "mdi:bed" },
        { name: "Water Pump", switch: "switch.pump_plug", power: "sensor.pump_plug_power", secondary_info: "last-changed", icon: "mdi:water-pump" }
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

  _formatRelativeTime(dateStr) {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${Math.max(1, diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  _getSecondaryText(entityId, type) {
    if (!entityId || !type || type === "none") return "";
    const stateObj = this._hass?.states?.[entityId];
    if (!stateObj) return "";

    if (type === "last-changed") {
      return this._formatRelativeTime(stateObj.last_changed);
    }
    if (type === "last-updated") {
      return this._formatRelativeTime(stateObj.last_updated);
    }
    if (type === "entity-id") {
      return entityId;
    }
    return "";
  }

  _toggle(entityId) {
    if (!this._hass || !entityId) return;
    const domain = entityId.split(".")[0];
    this._hass.callService(domain, "toggle", { entity_id: entityId });
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    const ev = new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId }
    });
    this.dispatchEvent(ev);
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
      const secText = this._getSecondaryText(dev.power || dev.switch, dev.secondary_info);

      return `
        <div class="row ${isOn ? "on" : "off"}">
          <!-- ทัชที่ชื่อและไอคอนเพื่อเปิด More-Info Dialog ของ Switch Entity -->
          <div class="col-name" data-entity="${dev.switch || ""}" title="ดูรายละเอียดอุปกรณ์">
            <ha-icon class="row-icon" icon="${icon}"></ha-icon>
            <span class="row-title">${this._escape(name)}</span>
          </div>

          <!-- ทัชที่ค่า W เพื่อเปิด More-Info Dialog ของ Power Sensor -->
          <div class="col-power ${dev.power ? "interactive" : ""}" data-entity="${dev.power || ""}" title="ดูกราฟกำลังไฟ">
            <div class="val-w-wrap">
              ${dev.power ? `<span class="val-w">${this._formatW(powerVal)}</span>` : '<span class="val-none">—</span>'}
              ${secText ? `<span class="val-sec">${this._escape(secText)}</span>` : ""}
            </div>
          </div>

          <!-- เฉพาะการกดที่สวิตช์ตรงนี้เท่านั้นที่จะเปิด-ปิดไฟ -->
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
          --color-on: #10b981;
          --color-watt: #f59e0b;
          --color-main: #38bdf8;
          --text-main: var(--primary-text-color, #e2e8f0);
          --text-sub: var(--secondary-text-color, #94a3b8);
          --line-border: var(--divider-color, rgba(255, 255, 255, 0.07));
        }

        ha-card {
          background: transparent;
          box-shadow: none;
          border: none;
          color: var(--text-main);
          padding: 2px 4px;
        }

        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 6px 6px;
          border-bottom: 1px solid var(--line-border);
          margin-bottom: 2px;
        }

        .header-title {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.2px;
          color: var(--text-sub);
        }

        .header-main-power {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .main-val {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-main);
          font-variant-numeric: tabular-nums;
          cursor: pointer;
        }

        .row-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 8px;
          padding: 2px 6px;
          border-radius: 6px;
          transition: background 0.15s ease;
          min-height: 34px;
        }

        .row:hover {
          background: rgba(125, 125, 125, 0.04);
        }

        .row.on {
          background: color-mix(in srgb, var(--color-on) 4%, transparent);
        }

        .col-name {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          cursor: pointer;
          user-select: none;
        }

        .col-name:hover .row-title {
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .row-icon {
          --mdc-icon-size: 17px;
          color: var(--text-sub);
          flex-shrink: 0;
          opacity: 0.85;
        }

        .row.on .row-icon {
          color: var(--color-on);
          opacity: 1;
        }

        .row-title {
          font-size: 13px;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .col-power {
          min-width: 76px;
          text-align: right;
          font-variant-numeric: tabular-nums;
          padding: 2px 4px;
          border-radius: 4px;
          user-select: none;
        }

        .col-power.interactive {
          cursor: pointer;
        }

        .col-power.interactive:hover {
          background: rgba(125, 125, 125, 0.12);
        }

        .val-w-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.15;
        }

        .val-w {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--color-watt);
        }

        .val-sec {
          font-size: 9.5px;
          color: var(--text-sub);
          opacity: 0.75;
          margin-top: 1px;
        }

        .row.off .val-w {
          color: var(--text-sub);
          opacity: 0.35;
        }

        .val-none {
          color: var(--text-sub);
          opacity: 0.25;
          font-size: 11px;
        }

        .col-switch {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 40px;
        }

        ha-switch {
          --switch-checked-button-color: var(--color-on);
          --switch-checked-track-color: color-mix(in srgb, var(--color-on) 35%, transparent);
          transform: scale(0.72);
          transform-origin: right center;
        }
      </style>

      <ha-card>
        <div class="header-bar">
          <span class="header-title">${this._escape(cfg.title)}</span>
          <div class="header-main-power">
            ${cfg.main_power ? `<span class="main-val" id="main-val-btn" title="ดูกราฟไฟรวม">${this._formatW(mainPowerVal)}</span>` : ""}
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

    // 1. กดที่สวิตช์ toggle เพื่อเปิด/ปิดไฟเท่านั้น
    this.shadowRoot.querySelectorAll(".col-switch ha-switch").forEach((sw) => {
      sw.addEventListener("click", (e) => e.stopPropagation());
      sw.addEventListener("change", () => this._toggle(sw.dataset.switch));
    });

    // 2. ทัชที่ชื่อหรือไอคอน -> เปิด More-info dialog ของ Switch
    this.shadowRoot.querySelectorAll(".col-name").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._openMoreInfo(el.dataset.entity);
      });
    });

    // 3. ทัชที่ค่า W -> เปิด More-info dialog ของ Power Sensor
    this.shadowRoot.querySelectorAll(".col-power.interactive").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._openMoreInfo(el.dataset.entity);
      });
    });

    // 4. ทัชที่ Main power W -> ดู info
    const mainValBtn = this.shadowRoot.querySelector("#main-val-btn");
    if (mainValBtn && cfg.main_power) {
      mainValBtn.addEventListener("click", () => this._openMoreInfo(cfg.main_power));
    }

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
// Visual Form Editor พร้อมระบบลากค้างที่ 2 ขีด สไตล์ Native HA
// ----------------------------------------------------
class PowerMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      title: "Switch & Power Monitor",
      main_power: "",
      main_switch: "",
      devices: [],
      ...config
    };
    this._editIndex = null;
    this._draggedIndex = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._formHeader) this._formHeader.hass = hass;
    if (this._editForm) this._editForm.hass = hass;
  }

  _render() {
    this.innerHTML = `
      <style>
        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 4px 0;
          font-family: inherit;
        }

        .label-heading {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
          margin-bottom: 6px;
        }

        .entities-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }

        .entity-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(125, 125, 125, 0.08);
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
          border-radius: 8px;
          padding: 8px 12px;
          transition: transform 0.15s ease, background 0.15s ease;
          position: relative;
        }

        .entity-row.is-dragging {
          opacity: 0.35;
          background: rgba(125, 125, 125, 0.03);
        }

        .entity-row.drop-target-above {
          border-top: 2px solid var(--primary-color, #0284c7);
        }

        .entity-row.drop-target-below {
          border-bottom: 2px solid var(--primary-color, #0284c7);
        }

        /* ปุ่ม 2 ขีด กดค้างลากขึ้น-ลง */
        .drag-handle {
          cursor: grab;
          color: var(--secondary-text-color);
          font-size: 20px;
          line-height: 1;
          user-select: none;
          touch-action: none;
          padding: 6px 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drag-handle:active {
          cursor: grabbing;
          color: var(--primary-color, #0284c7);
        }

        .entity-content {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .entity-icon {
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
        }

        .entity-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .entity-main-text {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entity-sub-text {
          font-size: 11px;
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-action {
          cursor: pointer;
          color: var(--secondary-text-color);
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.15s;
        }

        .btn-action:hover {
          color: var(--primary-text-color);
          background: rgba(125, 125, 125, 0.15);
        }

        .btn-action.del:hover {
          color: var(--error-color, #ef4444);
        }

        .btn-add-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px;
          border-radius: 8px;
          border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
          color: var(--primary-text-color);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          margin-top: 4px;
        }

        .btn-add-item:hover {
          background: rgba(125, 125, 125, 0.05);
          border-color: var(--primary-color);
        }

        .edit-panel {
          border: 1px solid var(--primary-color, #0284c7);
          background: rgba(125, 125, 125, 0.05);
          border-radius: 10px;
          padding: 12px;
          margin: 4px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .edit-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
        }
      </style>

      <div class="editor-container">
        <div id="form-header-container"></div>

        <div>
          <div class="label-heading">Entities (required)</div>
          <div class="entities-list" id="entities-list"></div>

          <button type="button" class="btn-add-item" id="btn-add-row">
            <ha-icon icon="mdi:plus" style="--mdc-icon-size: 18px;"></ha-icon> เพิ่ม Entity
          </button>
        </div>
      </div>
    `;

    // 1. Header Config Form
    const headerContainer = this.querySelector("#form-header-container");
    this._formHeader = document.createElement("ha-form");
    if (this._hass) this._formHeader.hass = this._hass;

    this._formHeader.schema = [
      { name: "title", label: "Title", selector: { text: {} } },
      { name: "main_power", label: "Main Power Sensor", selector: { entity: { domain: "sensor" } } },
      { name: "main_switch", label: "Main Switch", selector: { entity: { domain: ["switch", "light", "input_boolean"] } } }
    ];

    this._formHeader.data = {
      title: this._config.title,
      main_power: this._config.main_power,
      main_switch: this._config.main_switch
    };

    this._formHeader.addEventListener("value-changed", (ev) => {
      this._updateConfig({ ...ev.detail.value });
    });
    headerContainer.appendChild(this._formHeader);

    // 2. Entities List Rendering
    const listContainer = this.querySelector("#entities-list");
    const devs = this._config.devices || [];

    devs.forEach((dev, idx) => {
      if (this._editIndex === idx) {
        const editBox = document.createElement("div");
        editBox.className = "edit-panel";

        editBox.innerHTML = `
          <div class="edit-panel-header">
            <span>แก้ไข: ${this._escape(dev.name || dev.switch || "อุปกรณ์")}</span>
            <ha-icon class="btn-action" id="close-edit" icon="mdi:check" title="เสร็จสิ้น"></ha-icon>
          </div>
          <div id="edit-form-wrap"></div>
        `;

        const editForm = document.createElement("ha-form");
        if (this._hass) editForm.hass = this._hass;
        editForm.schema = [
          { name: "name", label: "Name", selector: { text: {} } },
          { name: "switch", label: "Switch Entity", selector: { entity: { domain: ["switch", "light", "input_boolean"] } } },
          { name: "power", label: "Power Sensor (W)", selector: { entity: { domain: "sensor" } } },
          {
            name: "secondary_info",
            label: "Secondary Information",
            selector: {
              select: {
                options: [
                  { value: "none", label: "None" },
                  { value: "last-changed", label: "Last changed" },
                  { value: "last-updated", label: "Last updated" },
                  { value: "entity-id", label: "Entity ID" }
                ]
              }
            }
          },
          { name: "icon", label: "Icon", selector: { icon: {} } }
        ];

        editForm.data = {
          secondary_info: "last-changed",
          ...dev
        };

        editForm.addEventListener("value-changed", (ev) => {
          const newDevices = [...this._config.devices];
          newDevices[idx] = ev.detail.value;
          this._updateConfig({ devices: newDevices }, false);
        });

        editBox.querySelector("#edit-form-wrap").appendChild(editForm);
        editBox.querySelector("#close-edit").addEventListener("click", () => {
          this._editIndex = null;
          this._render();
        });

        listContainer.appendChild(editBox);
      } else {
        const row = document.createElement("div");
        row.className = "entity-row";
        row.dataset.index = idx;

        const stateObj = this._hass?.states?.[dev.switch];
        const dispName = dev.name || stateObj?.attributes?.friendly_name || dev.switch || "ยังไม่ได้เลือกสวิตช์";
        const subInfo = dev.secondary_info && dev.secondary_info !== "none" ? `[${dev.secondary_info}]` : "";
        const subText = dev.switch ? `${dev.switch} ${dev.power ? `• ${dev.power}` : ""} ${subInfo}` : "คลิกดินสอเพื่อตั้งค่า";
        const icon = dev.icon || stateObj?.attributes?.icon || "mdi:flash";

        row.innerHTML = `
          <span class="drag-handle" title="กดค้างแล้วลากเพื่อย้ายตำแหน่ง">＝</span>
          <div class="entity-content">
            <ha-icon class="entity-icon" icon="${icon}"></ha-icon>
            <div class="entity-details">
              <span class="entity-main-text">${this._escape(dispName)}</span>
              <span class="entity-sub-text">${this._escape(subText)}</span>
            </div>
          </div>
          <div class="row-actions">
            <ha-icon class="btn-action del" icon="mdi:close" title="ลบ"></ha-icon>
            <ha-icon class="btn-action edit" icon="mdi:pencil" title="แก้ไข"></ha-icon>
          </div>
        `;

        // ปุ่มลบ
        row.querySelector(".del").addEventListener("click", (e) => {
          e.stopPropagation();
          const newDevices = [...this._config.devices];
          newDevices.splice(idx, 1);
          if (this._editIndex === idx) this._editIndex = null;
          this._updateConfig({ devices: newDevices });
          this._render();
        });

        // ปุ่มดินสอ
        row.querySelector(".edit").addEventListener("click", (e) => {
          e.stopPropagation();
          this._editIndex = idx;
          this._render();
        });

        // ----------------------------------------------------
        // ระบบ Drag & Drop ด้วยการกดค้างที่ปุ่ม 2 ขีด (＝)
        // ----------------------------------------------------
        const handle = row.querySelector(".drag-handle");

        // สำหรับ Mouse (Desktop)
        handle.addEventListener("mousedown", () => {
          row.draggable = true;
        });

        row.addEventListener("dragstart", (e) => {
          this._draggedIndex = idx;
          row.classList.add("is-dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", idx);
        });

        row.addEventListener("dragend", () => {
          row.draggable = false;
          row.classList.remove("is-dragging");
          this._clearDropIndicators();
        });

        row.addEventListener("dragover", (e) => {
          e.preventDefault();
          const rect = row.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          this._clearDropIndicators();
          if (e.clientY < midY) {
            row.classList.add("drop-target-above");
          } else {
            row.classList.add("drop-target-below");
          }
        });

        row.addEventListener("drop", (e) => {
          e.preventDefault();
          const rect = row.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const from = this._draggedIndex;
          let to = idx;

          if (e.clientY >= midY && from < to) {
            // เลื่อนลงไปข้างล่าง
          } else if (e.clientY < midY && from > to) {
            // เลื่อนขึ้นไปข้างบน
          }

          if (from !== null && from !== to) {
            this._moveItem(from, to);
          }
          this._clearDropIndicators();
        });

        // สำหรับ Touch Screen (มือถือ / แท็บเล็ต)
        let touchStartY = 0;
        let isTouching = false;

        handle.addEventListener("touchstart", (e) => {
          isTouching = true;
          this._draggedIndex = idx;
          touchStartY = e.touches[0].clientY;
          row.classList.add("is-dragging");
        }, { passive: true });

        handle.addEventListener("touchmove", (e) => {
          if (!isTouching) return;
          const currentY = e.touches[0].clientY;
          const elemBelow = this.shadowRoot ? this.shadowRoot.elementFromPoint(e.touches[0].clientX, currentY) : document.elementFromPoint(e.touches[0].clientX, currentY);
          const targetRow = elemBelow?.closest(".entity-row");

          this._clearDropIndicators();
          if (targetRow && targetRow !== row) {
            const rect = targetRow.getBoundingClientRect();
            if (currentY < rect.top + rect.height / 2) {
              targetRow.classList.add("drop-target-above");
            } else {
              targetRow.classList.add("drop-target-below");
            }
          }
        }, { passive: true });

        handle.addEventListener("touchend", (e) => {
          if (!isTouching) return;
          isTouching = false;
          row.classList.remove("is-dragging");

          const dropTarget = this.querySelector(".drop-target-above, .drop-target-below");
          if (dropTarget && dropTarget.dataset.index !== undefined) {
            const to = Number(dropTarget.dataset.index);
            if (this._draggedIndex !== null && this._draggedIndex !== to) {
              this._moveItem(this._draggedIndex, to);
            }
          }
          this._clearDropIndicators();
          this._draggedIndex = null;
        });

        listContainer.appendChild(row);
      }
    });

    // ปุ่มเพิ่มแถวใหม่
    const btnAdd = this.querySelector("#btn-add-row");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        const newDevices = [
          ...(this._config.devices || []),
          { name: "", switch: "", power: "", secondary_info: "last-changed", icon: "" }
        ];
        this._editIndex = newDevices.length - 1;
        this._updateConfig({ devices: newDevices });
        this._render();
      });
    }
  }

  _clearDropIndicators() {
    this.querySelectorAll(".entity-row").forEach((el) => {
      el.classList.remove("drop-target-above", "drop-target-below");
    });
  }

  _moveItem(from, to) {
    const list = [...(this._config.devices || [])];
    const item = list.splice(from, 1)[0];
    list.splice(to, 0, item);
    this._updateConfig({ devices: list });
    this._render();
  }

  _updateConfig(patch, triggerRender = true) {
    this._config = { ...this._config, ...patch };
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  _escape(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}

customElements.define("power-monitor-card-editor", PowerMonitorCardEditor);
customElements.define("power-monitor-card", PowerMonitorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "power-monitor-card",
  name: "Power Monitor Card (Slim List)",
  description: "Ultra-compact switch and power card with native HA drag handle and info touch dialogs",
  preview: true
});
