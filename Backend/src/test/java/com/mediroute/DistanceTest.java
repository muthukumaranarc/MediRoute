package com.mediroute;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class DistanceTest {
 @Test void samePointIsZero(){assertEquals(0,Api.dist(11,76,11,76),1e-9);}
 @Test void distanceIsSymmetricAndPositive(){double a=Api.dist(11.0168,76.9558,11.08,76.97);assertTrue(a>7&&a<8);assertEquals(a,Api.dist(11.08,76.97,11.0168,76.9558),1e-9);}

 @Test void demoModeKeepsSeededHospitalsEligibleAndNearestFirst() {
  Instant yesterday = Instant.now().minus(1, ChronoUnit.DAYS);
  Hospital near = new Hospital("h-near", "Near Hospital", 11.4480, 77.6830, Op.OPEN, true, 4, new String[]{"RESPIRATORY", "GENERAL_EMERGENCY"}, new String[]{"OXYGEN", "VENTILATOR"}, yesterday);
  Hospital far = new Hospital("h-far", "Far Hospital", 11.2189, 78.1674, Op.OPEN, true, 20, new String[]{"RESPIRATORY", "GENERAL_EMERGENCY"}, new String[]{"OXYGEN", "VENTILATOR"}, yesterday);
  EmergencyCase c = new EmergencyCase();
  c.id = "c1";
  c.pickupLatitude = 11.4518;
  c.pickupLongitude = 77.6973;
  c.requiredServices = Set.of("RESPIRATORY", "GENERAL_EMERGENCY");
  c.requiredEquipment = Set.of("OXYGEN", "VENTILATOR");

  List<Result> results = Api.rankHospitals(c, List.of(far, near), Instant.now(), 5, true);
  assertEquals(2, results.stream().filter(Result::eligible).count());
  assertEquals("h-near", results.get(0).hospital().id);
 }

 @Test void zeroStrictMatchesStillGuaranteesNearestOpenFallbackHospitals() {
  Instant stale = Instant.now().minus(2, ChronoUnit.HOURS);
  Hospital nearestOpen = new Hospital("h-open-1", "Nearest Open", 11.4480, 77.6830, Op.OPEN, true, 8, new String[]{"GENERAL_EMERGENCY"}, new String[]{"OXYGEN"}, stale);
  Hospital fartherOpen = new Hospital("h-open-2", "Farther Open", 11.3410, 77.7240, Op.OPEN, true, 20, new String[]{"GENERAL_EMERGENCY"}, new String[]{"OXYGEN"}, stale);
  EmergencyCase c = new EmergencyCase();
  c.id = "c2";
  c.pickupLatitude = 11.4518;
  c.pickupLongitude = 77.6973;
  c.requiredServices = Set.of("RESPIRATORY");
  c.requiredEquipment = Set.of("VENTILATOR");

  List<Result> results = Api.rankHospitals(c, List.of(fartherOpen, nearestOpen), Instant.now(), 5, false);
  List<Result> eligible = results.stream().filter(Result::eligible).toList();
  assertFalse(eligible.isEmpty(), "Every case must return at least one eligible hospital");
  assertEquals("h-open-1", eligible.get(0).hospital().id);
 }
}
