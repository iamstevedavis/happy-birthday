# happy-birthday
Automatically sends happy birthday to people

Uses github actions to zip up the build and push to S3 for consumption by the lambda. Lambda runs once a day and checks for users that meet the following criteria:
 - They have a cell phone number
 - It is their birthday
 - I have specified they should be sent the message via a custom field in Google contacts
 
 Lambda auths with Google to get my contacts and Twilio to send the message.
