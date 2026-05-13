# Prakriti Track
**Biomedical Waste Management System — Trial Guide**

This guide provides a complete, step-by-step walkthrough to test the end-to-end functionality of the Prakriti Track platform. The system is divided into three key roles: **Admin**, **Driver**, and **Plant Manager**.

---

## 1. Initial Setup (Admin)
_To be performed on a desktop or laptop._

1. Navigate to the application URL in your web browser.
2. Log in using the **Plant Head** credentials (`admin@prakrititrack.in` / `admin123`).
3. **Register a Healthcare Facility (HCF):**
   - Go to **Management > HCF Registry**.
   - Click **+ Add HCF** and create a test hospital (ensure you assign it an HCF Code, e.g., `HCF001`).
4. **Register a Vehicle & Driver:**
   - Go to **Management > Vehicles**.
   - Click **+ Add Vehicle** (e.g., `JH-10-AB-1234`) and assign `Driver` from the dropdown.

---

## 2. Generate Waste Bags (Admin)
_Simulating the hospital handing over bags._

1. Go to **Bag Tracker** from the sidebar.
2. Click **+ Create Bags**.
3. Select your test hospital from the dropdown.
4. Select a waste category (e.g., **Yellow**) and enter a quantity (e.g., `3`).
5. Click **Generate Bags**.
6. The system will instantly generate unique QR codes for each bag. Click **Print All Labels** to view the labels.
_Note: For the trial, you can print these labels, or simply leave them open on your screen to scan with a mobile phone._

---

## 3. Collection Workflow (Driver)
_Simulating the driver picking up the waste. Perform these steps on a mobile phone or split-screen browser._

1. Log in using the **Driver** credentials (`driver1@prakrititrack.in` / `driver123`).
2. **Start Route:**
   - On the Route Overview page, select your vehicle and click **Start Today's Route**.
3. **Check-In:**
   - Click **GPS Check-in** to log your arrival coordinates at the hospital.
4. **Scan Bags:**
   - Click **Scan Bag** to open the built-in camera.
   - Point the camera at the 3 QR codes you generated in Step 2.
   - After scanning a code, click **Confirm Collection**.
5. **Weigh Bags (Optional):**
   - Go to the **Weigh** tab and manually enter the weight for the collected bags.

---

## 4. Plant Gate Receipt (Plant Manager)
_Simulating the truck arriving at the treatment plant._

1. Log in using the **Manager** credentials (`manager@prakrititrack.in` / `manager123`).
2. Go to **Plant > Gate Scan**.
3. Click **Open Camera Scanner** and scan the exact same 3 QR codes to simulate unloading the truck at the facility.
4. Once all bags appear on the list, click **Confirm Receipt**.

---

## 5. Reconciliation (Plant Manager)
_Ensuring zero waste divergence during transit._

1. Go to **Plant > Reconciliation**.
2. Select the active route driven by your driver.
3. The system will compare the bags marked "Collected" against the bags marked "Received". If successfully completed, the difference will show as **0**.

---

## 6. Treatment & Certification (Plant Manager)
_Simulating the final disposal process._

1. **Create a Batch:**
   - Go to **Plant > Batches**.
   - Select the 3 received bags from the table and click **+ Create Batch**.
   - Assign a treatment type (e.g., Autoclave) and save.
2. **Mark as Treated:**
   - Go to **Plant > Treatment & Certs**.
   - Find your newly created batch and click **View**.
   - Click **Mark as Treated**.
3. **Generate Certificate:**
   - Click **Print Certificate** to instantly generate the official Disposal Certificate for the hospital.

---
_End of Trial Workflow._
