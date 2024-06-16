import pandas as pd
import numpy as np
import gensim
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
from nltk.tokenize import word_tokenize
from gensim.models.doc2vec import Doc2Vec
from wordsegment import load, segment

# Split by UpperCase
def splitAtUpperCase(s):
    for i in range(len(s)-1)[::-1]:
        if s[i].isupper() and s[i+1].islower():
            s = s[:i]+' '+s[i:]
        if s[i].isupper() and s[i-1].islower():
            s = s[:i]+' '+s[i:]
            
    return s[1:]  #s.split()

def load_wordsegment():
    load()

def split_wordsegment(s):
    #print(segment(s)) ['total', 'cost', 'for', 'period']
    #print(segment(s)[0])
    res = ' '.join(segment(s))
    return res

def splitWordSegment(df):
    load_wordsegment()
    for index, row in df.iterrows(): 
        df.loc[index,'FormElementName'] = split_wordsegment(row['FormElementName'])
    return df


def process_data_new(df):
    load_wordsegment()
    for index, row in df.iterrows(): 
        if not row['FormElementName']:
            df.loc[index,'FormElementName'] = split_wordsegment(row['FormElementName'])
    df = df.applymap(str)
    
    gdf = df.groupby(['FormGuid','ProjectName'])
    gdf = gdf[['ProjectName', 'filename', 'FormName', 'FormGuid', 'FormElementName']]
    return gdf







#Split COLUMN_NAME
def process_data(df):

    df = df[['COLUMN_NAME', 'TABLE_NAME', 'ORDINAL_POSITION']]

    for index, row in df.iterrows():
        df.loc[index,'COLUMN_NAME'] = splitAtUpperCase(row['COLUMN_NAME'])
        
    df = df.applymap(str)

    # Grouping one form -> one row of dataframe
    gdf = df.groupby('TABLE_NAME')
    return gdf

# Dataframe to one paragraph

def stringify(df, option_tb = 0, option_p = 0):
    
    if option_tb == 0 or option_tb == 1: 
        df = df.drop(columns=['TABLE_NAME'])

    if option_p == 0: 
        df = df.drop(columns=['ORDINAL_POSITION'])
            
    lst = df.values.tolist()

    sentence = ''
    for row in lst:
        for el in row:
            if el != 'nan':
                sentence = sentence + el + ' ' #''.join(dictionary etc)
    return sentence


# iterate form -> sentence -> concatenat into a list [,,]
def df_to_sentence(gdf, option_tb = 0, option_p = 0):
    res = []
    
    for table_name, df in gdf:
        sentence = stringify(df,option_tb, option_p)
        if option_tb == 1:
            sentence = sentence + table_name
        res.append({table_name: sentence})
    return res

# option_tb 2 : keep table name multiple times
# option_tb 1 : keep table name once
# option_tb 0 : drop table name

# option_p 1 : keep ordinal position
# option_p 0 : drop ordinal position
def df_set(gdf, option_tb=1, option_p=0):

    res = []

    for table_name, df in gdf:
        df = df.dropna()
        tn = df['TABLE_NAME'].iloc[0]
        
        if option_tb == 0 or option_tb == 1: 
            df = df.drop(columns=['TABLE_NAME'])

        if option_p == 0: 
            df = df.drop(columns=['ORDINAL_POSITION'])
                
        lst = df.values.tolist()    
        flat_list = [item for sublist in lst for item in sublist]
        
        if option_tb == 1: 
            flat_list.append(tn)
            
        res.append(set(flat_list))

    return res
    
    
def create_inetrsection_matrix(lst_set):
    mtr = []

    for fe1 in lst_set:
        row = []
        for fe2 in lst_set:
            
            u = fe1.union(fe2)
            i = fe1.intersection(fe2)
            dist = 1- len(i) / len(u)
            row.append(dist)
        mtr.append(row)

    matrix = pd.DataFrame.from_records(mtr)
    return matrix

# Tokenizing / Tagging Data
# Don't need to stringify -> tokenize it again because we have tokenized dataset already
def tagging_data(data):
    res = []
    
    for i, _d in enumerate(data):
        for x in _d:
            res.append(TaggedDocument(words=word_tokenize(_d[x]), tags=[x]))
    return res


def train(tagged_data, e = 500, v = 50):
    model = gensim.models.doc2vec.Doc2Vec(vector_size=v, min_count=2, epochs=e)
    model.build_vocab(tagged_data)
    model.train(tagged_data, total_examples=model.corpus_count, epochs=e)
    model.save("data/d2v.model")
    return model


from numpy import zeros, random, sum as np_sum, add as np_add, concatenate, \
    repeat as np_repeat, array, float32 as REAL, empty, ones, memmap as np_memmap, \
    sqrt, newaxis, ndarray, dot, vstack, dtype, divide as np_divide

from gensim import utils, matutils 

def cal_score_unseen(a, b, model, test_data, dummy_table):
    list1 = [test_data[dummy_table[a]][a]]
    list2 = [test_data[dummy_table[b]][b]]
    return model.docvecs.similarity_unseen_docs(model, list1, list2)
    

def cal_score_cos(a, b, model, test_data, dummy_table, alpha=0.1, min_alpha=0.0001,steps=5):
  

    d1 = model.infer_vector(doc_words=[test_data[dummy_table[a]][a]], alpha=alpha, min_alpha=min_alpha, steps=steps)
    d2 = model.infer_vector(doc_words=[test_data[dummy_table[b]][b]] , alpha=alpha, min_alpha=min_alpha, steps=steps)

    similarity_score = dot(matutils.unitvec(d1), matutils.unitvec(d2))

    return similarity_score
    
    
# table x table score matrix
# distance = 1 - similarity score
def matrix(test_tables, loaded_model, test_data, dummy_table, dist_neg = 1):
    lst_test = []

    for x in test_tables:
        d_x = []
        for y in test_tables:
            if x == y:
                d_x.append(0) # res dist is not exactly 0. Set to 0 here.
            else:
                score_ = cal_score_cos(x, y, loaded_model, test_data, dummy_table, alpha=0.1, min_alpha=0.0001,steps=5)

                if dist_neg == 1:
                    dist = 1 - score_
                else:
                    dist = 1 - np.abs(score_)
 
                d_x.append(dist) 
                
        lst_test.append(d_x)
    return lst_test