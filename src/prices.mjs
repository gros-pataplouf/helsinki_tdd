import { Temporal } from "@js-temporal/polyfill";
import "./polyfills";
import express from "express";

// Refactor the following code to get rid of the legacy Date class.
// Use Temporal.PlainDate instead. See /test/date_conversion.spec.mjs for examples.

function createApp(database) {
  const app = express();

  app.put("/prices", (req, res) => {
    const type = req.query.type;
    const cost = parseInt(req.query.cost);
    database.setBasePrice(type, cost);
    res.json();
  });

  app.get("/prices", (req, res) => {
    const age = req.query.age ? parseInt(req.query.age) : undefined;
    const type = req.query.type;
    const baseCost = database.findBasePriceByType(type).cost;
    const date2 = parseDate(req.query.date)
    const cost = calculateCost(age, type, date2, baseCost);
    res.json({ cost });
  });

  function parseDate(dateString) {
    if (dateString) {
      return convert(new Date(dateString));
    }
  }

  function convert(date) {return date && Temporal.PlainDate.from(`${date.toISOString().replace("Z", "")}`);}

  function calculateCost(age, type, date2, baseCost) {
    if (type === "night") {
      return calculateCostForNightTicket(age, baseCost);
    } else {
      return calculateCostForDayTicket(age, date2, baseCost);
    }
  }

  function calculateCostForNightTicket(age, baseCost) {
    if (age === undefined) {
      return 0;
    }
    if (age < 6) {
      return 0;
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.4);
    }
    return baseCost;
  }

  function calculateCostForDayTicket(age, date2, baseCost) {
    let reduction = calculateReduction(date2);
    if (age === undefined) {
      return Math.ceil(baseCost * (1 - reduction / 100));
    }
    if (age < 6) {
      return 0;
    }
    if (age < 15) {
      return Math.ceil(baseCost * 0.7);
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.75 * (1 - reduction / 100));
    }
    return Math.ceil(baseCost * (1 - reduction / 100));
  }

  function calculateReduction(date2) {
    let reduction = 0;
    if (date2 && isMonday(date2) && !isHoliday(date2)) {
      reduction = 35;
    }
    return reduction;
  }

  function isMonday(date2) {
    return date2.dayOfWeek === 1;
  }

  function isHoliday(date2) {
    const holidays = database.getHolidays();
    for (let row of holidays) {
      let holidayTemporal = Temporal.PlainDate.from(row.holiday);
      if (
        date2 &&
        date2.year === holidayTemporal.year &&
        date2.month === holidayTemporal.month &&
        date2.day === holidayTemporal.day
      ) {
        return true;
      }
    }
    return false;
  }

  return app;
}

export { createApp };
