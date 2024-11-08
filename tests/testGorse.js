import { Gorse } from "gorsejs";

const client = new Gorse({ endpoint: "http://127.0.0.1:8088", secret: "zhenghaoz" });

// await client.insertFeedbacks([
//     { FeedbackType: 'star', UserId: 'bob', ItemId: 'vuejs:vue', Timestamp: '2022-02-24' },
//     { FeedbackType: 'star', UserId: 'bob', ItemId: 'd3:d3', Timestamp: '2022-02-25' },
//     { FeedbackType: 'star', UserId: 'bob', ItemId: 'dogfalo:materialize', Timestamp: '2022-02-26' },
//     { FeedbackType: 'star', UserId: 'bob', ItemId: 'mozilla:pdf.js', Timestamp: '2022-02-27' },
//     { FeedbackType: 'star', UserId: 'bob', ItemId: 'moment:moment', Timestamp: '2022-02-28' }
// ]);

client.getUserFeedback("bob", "read").then(feedback => {
    console.log("User feedback items:", feedback);
}).catch(error => {
    console.error("Error fetching viewed items:", error);
});
