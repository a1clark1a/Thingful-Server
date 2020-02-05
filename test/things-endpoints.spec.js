const knex = require("knex");
const app = require("../src/app");
const helpers = require("./test-helpers");

describe("Things Endpoints", function() {
  let db;

  const { testUsers, testThings, testReviews } = helpers.makeThingsFixtures();

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("cleanup", () => helpers.cleanTables(db));

  afterEach("cleanup", () => helpers.cleanTables(db));

  describe(`GET /api/things`, () => {
    context(`Given no things`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get("/api/things")
          .expect(200, []);
      });
    });

    context("Given there are things in the database", () => {
      beforeEach("insert things", () =>
        helpers.seedThingsTables(db, testUsers, testThings, testReviews)
      );

      it("responds with 200 and all of the things", () => {
        const expectedTestUsers = helpers.makeExpectedUsersArray();
        const expectedThingsArray = helpers.makeExpectedThingsArray(
          expectedTestUsers
        );
        const expectReviews = helpers.makeExpectedReviewsArray(
          expectedTestUsers,
          expectedThingsArray
        );
        const expectedThings = expectedThingsArray.map(thing =>
          helpers.makeExpectedThing(expectedTestUsers, thing, expectReviews)
        );
        return supertest(app)
          .get("/api/things")
          .expect(200, expectedThings);
      });
    });

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1];
      const { maliciousThing, expectedThing } = helpers.makeMaliciousThing(
        testUser
      );

      beforeEach("insert malicious thing", () => {
        return helpers.seedMaliciousThing(db, testUser, maliciousThing);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/api/things`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedThing.title);
            expect(res.body[0].content).to.eql(expectedThing.content);
          });
      });
    });
  });

  describe(`GET /api/things/:thing_id`, () => {
    context(`Given no things`, () => {
      //beforeEach(() => db.into("thingful_users").insert(testUsers));
      beforeEach(() => helpers.seedUsers(db, testUsers));
      it(`responds with 404`, () => {
        const thingId = 123456;
        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` });
      });
    });

    context("Given there are things in the database", () => {
      beforeEach("insert things", () =>
        helpers.seedThingsTables(db, testUsers, testThings, testReviews)
      );

      it("responds with 200 and the specified thing", () => {
        const thingId = 2;
        const expectedTestUsers = helpers.makeExpectedUsersArray();
        const expectedThingsArray = helpers.makeExpectedThingsArray(
          expectedTestUsers
        );
        const expectReviews = helpers.makeExpectedReviewsArray(
          expectedTestUsers,
          expectedThingsArray
        );
        const expectedThing = helpers.makeExpectedThing(
          expectedTestUsers,
          expectedThingsArray[thingId - 1],
          expectReviews
        );

        return supertest(app)
          .get(`/api/things/${thingId}`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedThing);
      });
    });

    context(`Given an XSS attack thing`, () => {
      const testUser = helpers.makeUsersArray()[1];
      const { maliciousThing, expectedThing } = helpers.makeMaliciousThing(
        testUser
      );

      beforeEach("insert malicious thing", () => {
        return helpers.seedMaliciousThing(db, testUser, maliciousThing);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/api/things/${maliciousThing.id}`)
          .set("Authorization", helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedThing.title);
            expect(res.body.content).to.eql(expectedThing.content);
          });
      });
    });
  });

  describe(`GET /api/things/:thing_id/reviews`, () => {
    context(`Given no things`, () => {
      // beforeEach(() => db.into("thingful_users").insert(testUsers));
      beforeEach(() => helpers.seedUsers(db, testUsers));
      it(`responds with 404`, () => {
        const thingId = 123456;
        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Thing doesn't exist` });
      });
    });

    context("Given there are reviews for thing in the database", () => {
      beforeEach("insert things", () =>
        helpers.seedThingsTables(db, testUsers, testThings, testReviews)
      );

      it("responds with 200 and the specified reviews", () => {
        const expectedTesUsers = helpers.makeExpectedUsersArray();
        const expectedReviewsArray = helpers.makeExpectedReviewsArray(
          expectedTesUsers,
          testThings
        );
        const thingId = 1;
        const expectedReviews = helpers.makeExpectedThingReviews(
          expectedTesUsers,
          thingId,
          expectedReviewsArray
        );

        return supertest(app)
          .get(`/api/things/${thingId}/reviews`)
          .set("Authorization", helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedReviews);
      });
    });
  });
});
