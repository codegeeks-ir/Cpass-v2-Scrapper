import puppeteer from "puppeteer-core";
import "dotenv/config";
import path from "path";
import process from "process";
// Or import puppeteer from 'puppeteer-core';
import fs from "fs/promises";
let lessons = [];
type tableData = {
  code: number;
  name: string;
  count: number;
  grade: number;
  status: string;
};
const code = process.env.SAMA_USERNAME;
const password = process.env.SAMA_PASS;
const filename = process.env.FILE_NAME || "result";

async function Scrapper() {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    executablePath: process.env.BROWSER_EXEC,
    args: [
      "--disable-features=PasswordManagerOnboarding,PasswordLeakDetection",
      "--disable-save-password-bubble",
      "--disable-password-generation",
    ],
    headless: false,
  });

  if (!code || !password) throw "Password or code is empty";

  let page = await browser.newPage();
  await page.goto("https://edu.uut.ac.ir/samaweb/login.aspx", {
    waitUntil: "domcontentloaded",
  });
  await page.type('input[name="UserCode"]', code);
  await page.type('input[name="KeyCode"]', password);
  await page.click('input[type="submit"]');

  await page.waitForNavigation({ waitUntil: "load" });

  await page.goto(
    "https://edu.uut.ac.ir/samaweb/WorkBookReport.asp?lstTerm=0,99999",
    { waitUntil: "load" }
  );

  await page.waitForSelector("#tabs .tab-content");
  let data = await page.evaluate(() => {
    let tabs = document.querySelectorAll("#tabs .tab-pane");
    let tableData = [];
    for (let i = 0; i < tabs.length; i++) {
      let table = tabs[i].children[1].children[0];
      for (let j = 0; j < table.children.length; j++) {
        let tableRow = table.children[j];
        if (j == 0) continue;
        let rowItems = tableRow.children;
        console.log(tableRow.children);
        let row = {
          code: parseInt(rowItems[0].children[0].textContent!),
          name: rowItems[1].children[0].textContent!,
          count: parseInt(rowItems[2].children[0].textContent!),
          grade: parseFloat(rowItems[3].children[0].textContent!),
          status: rowItems[4].children[0].textContent!,
        };
        tableData.push(row);
      }
    }
    console.log(tableData);
    return tableData;
  });

  const outputPath = path.join(process.cwd(), "result.json");

  await fs.writeFile(
    outputPath,
    replaceArabicWithPersian(JSON.stringify(data, null, 2)),
    "utf-8"
  );
  await page.deleteCookie();
  await browser.close();
}

// let sanitized = replaceArabicWithPersian(JSON.stringify(data, null, 2));

// Save the scraped data as JSON
// const filePath = path.join(process.cwd(), "data", filename + ".json");
// await fs.writeFile(filePath, sanitized, "utf-8");

// console.log(`Scraping complete. Data saved to ${filePath}`);

function delay(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function replaceArabicWithPersian(text: string): string {
  const arabicToPersianMap = {
    ك: "ک", // Arabic "ك" to Persian "ک"
    ي: "ی", // Arabic "ي" to Persian "ی"
    ه: "ه", // Arabic "ه" is generally the same in Persian
    ة: "ه", // Arabic "ة" to Persian "ه"
    ئ: "ی", // Arabic "ئ" to Persian "ی"
  };

  // Replace each Arabic character in the text with its Persian equivalent
  return text.replace(/[كيهةئ]/g, function (match) {
    // @ts-expect-error
    return arabicToPersianMap[match];
  });
}

Scrapper();
