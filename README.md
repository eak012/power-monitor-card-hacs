# Power Monitor Card

A clean, transparent, and theme-adaptive switch & power monitoring Lovelace card for Home Assistant.

## Features

- **Theme-Adaptive**: ไม่มีสีพื้นหลังฟิกซ์ กลืนไปกับธีม Lovelace ที่ใช้งานอยู่
- **Semantic Colors**:
  - 🔵 **Main Power**: สีฟ้าสว่าง อ่านค่าง่าย
  - 🟢 **Active State (ON)**: สีเขียวมินต์ ชัดเจน สบายตา
  - 🟠 **Real-time Power (W / kW)**: สีส้มอำพัน แยกแยะปริมาณการใช้ไฟฟ้าได้ทันที
  - ⚪ **Muted (OFF)**: สีเทาตามธีมเมื่อปิดอุปกรณ์
- **Grid Layout**: รองรับ 2 คอลัมน์ (ปรับตามขนาดหน้าจออัตโนมัติ)
- **HACS Ready**: ติดตั้งผ่าน Custom Repository ใน HACS ได้ทันที

## Installation

### Via HACS

1. ไปที่ **HACS** → **Frontend**
2. เลือกเมนู 3 จุดมุมขวาบน → **Custom repositories**
3. ใส่ URL ของ GitHub Repository นี้ และเลือกหมวดหมู่เป็น **Lovelace**
4. กด **Download** และรีเฟรชหน้าแดชบอร์ด

### Manual

คัดลอกไฟล์ `power-monitor-card.js` ไปวางไว้ที่ `/config/www/power-monitor-card.js` แล้วเพิ่ม Resource:

Example Configuration
```yaml
type: custom:power-monitor-card
title: Switch & Power Monitor
columns: 2
main_power: sensor.main_power
main_switch: switch.main

devices:
  - name: Air Living
    switch: switch.airlivbk
    power: sensor.airlivbk_power
    icon: mdi:sofa

  - name: Air Bed
    switch: switch.airbedr_airbedroom
    power: sensor.airbedr_energy_power
    icon: mdi:bed

  - name: Air Small Bed
    switch: switch.secondbedroom
    power: sensor.secondbedroom_power
    icon: mdi:bed-outline

  - name: Water Pump
    switch: switch.pump_plug
    power: sensor.pump_plug_power
    icon: mdi:water-pump

  - name: Solar Meter
    switch: switch.solarmeter
    power: ""
    icon: mdi:solar-power-variant

  - name: O₂
    switch: switch.o2
    power: sensor.o2_power
    icon: mdi:air-filter
```
